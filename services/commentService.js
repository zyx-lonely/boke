const { logger } = require('../middleware/logger');
const { AppError } = require('../middleware/errorHandler');
const { sendCommentNotification } = require('./emailService');

class CommentService {
  constructor(pool) {
    this.pool = pool;
  }

  async getCommentsByResource(resourceId) {
    try {
      const conn = await this.pool.getConnection();
      const [rows] = await conn.query(
        `SELECT * FROM comments WHERE resource_id = ? AND status = 'approved' ORDER BY created_at DESC`,
        [resourceId]
      );
      conn.release();
      return rows;
    } catch (error) {
      logger.error('获取评论失败', { error });
      throw new AppError('获取评论失败', 500);
    }
  }

  async createComment(resourceId, username, email, content, parentId = null) {
    try {
      const conn = await this.pool.getConnection();
      
      const [resourceRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [resourceId]);
      if (resourceRows.length === 0) {
        conn.release();
        throw new AppError('资源不存在', 404);
      }

      if (parentId) {
        const [parentRows] = await conn.query(`SELECT id FROM comments WHERE id = ?`, [parentId]);
        if (parentRows.length === 0) {
          conn.release();
          throw new AppError('父评论不存在', 404);
        }
      }

      const [result] = await conn.query(
        `INSERT INTO comments (resource_id, username, email, content, parent_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [resourceId, username, email, content, parentId, 'pending']
      );
      conn.release();

      return { id: result.insertId };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('添加评论失败', { error });
      throw new AppError('添加评论失败', 500);
    }
  }

  async toggleLike(commentId, userId = 0) {
    try {
      const conn = await this.pool.getConnection();
      const [checkRows] = await conn.query(`SELECT id, likes FROM comments WHERE id = ?`, [commentId]);
      
      if (checkRows.length === 0) {
        conn.release();
        throw new AppError('评论不存在', 404);
      }

      const [likeRows] = await conn.query(
        `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
        [commentId, userId]
      );

      let isLiked;
      let newLikes;

      if (likeRows.length > 0) {
        await conn.query(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId]);
        newLikes = (checkRows[0].likes || 0) - 1;
        isLiked = false;
      } else {
        await conn.query(`INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, [commentId, userId]);
        newLikes = (checkRows[0].likes || 0) + 1;
        isLiked = true;
      }

      await conn.query(`UPDATE comments SET likes = ? WHERE id = ?`, [newLikes, commentId]);
      conn.release();

      return { likes: newLikes, liked: isLiked };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('点赞失败', { error });
      throw new AppError('点赞失败', 500);
    }
  }

  async getAdminComments(status = '', page = 1, limit = 20) {
    try {
      const conn = await this.pool.getConnection();
      const offset = (page - 1) * limit;
      
      let where = '';
      let params = [];

      if (status) {
        where = 'WHERE c.status = ?';
        params.push(status);
      }

      const countQuery = `
        SELECT COUNT(*) as total 
        FROM comments c 
        LEFT JOIN resources r ON c.resource_id = r.id
        ${where}
      `;
      const [countRows] = await conn.query(countQuery, [...params]);
      const total = countRows[0].total;

      const query = `
        SELECT c.*, r.title as resource_title 
        FROM comments c 
        LEFT JOIN resources r ON c.resource_id = r.id
        ${where}
        ORDER BY c.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      const [rows] = await conn.query(query, [...params, limit, offset]);
      conn.release();
      
      return {
        items: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取评论列表失败', { error });
      throw new AppError('获取评论列表失败', 500);
    }
  }

  async approveComment(id) {
    try {
      const conn = await this.pool.getConnection();
      const [commentRows] = await conn.query(
        `SELECT c.*, r.title as resource_title FROM comments c LEFT JOIN resources r ON c.resource_id = r.id WHERE c.id = ?`, [id]
      );
      if (commentRows.length === 0) { conn.release(); throw new AppError('评论不存在', 404); }

      await conn.query(`UPDATE comments SET status = 'approved' WHERE id = ?`, [id]);
      conn.release();

      const c = commentRows[0];
      if (c.email) {
        sendCommentNotification(this.pool, c.email, c.username, c.resource_title, 'approved', c.content)
          .catch(e => logger.warn('发送审核通知邮件失败', { error: e.message }));
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('审核评论失败', { error });
      throw new AppError('审核评论失败', 500);
    }
  }

  async rejectComment(id) {
    try {
      const conn = await this.pool.getConnection();
      const [commentRows] = await conn.query(
        `SELECT c.*, r.title as resource_title FROM comments c LEFT JOIN resources r ON c.resource_id = r.id WHERE c.id = ?`, [id]
      );
      if (commentRows.length === 0) { conn.release(); throw new AppError('评论不存在', 404); }

      await conn.query(`UPDATE comments SET status = 'rejected' WHERE id = ?`, [id]);
      conn.release();

      const c = commentRows[0];
      if (c.email) {
        sendCommentNotification(this.pool, c.email, c.username, c.resource_title, 'rejected', c.content)
          .catch(e => logger.warn('发送审核通知邮件失败', { error: e.message }));
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('拒绝评论失败', { error });
      throw new AppError('拒绝评论失败', 500);
    }
  }

  async deleteComment(id) {
    try {
      const conn = await this.pool.getConnection();
      const [result] = await conn.query(`DELETE FROM comments WHERE id = ?`, [id]);
      conn.release();

      if (result.affectedRows === 0) {
        throw new AppError('评论不存在', 404);
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('删除评论失败', { error });
      throw new AppError('删除评论失败', 500);
    }
  }

  async batchDeleteComments(ids) {
    try {
      const conn = await this.pool.getConnection();
      const [result] = await conn.query(`DELETE FROM comments WHERE id IN (?)`, [ids]);
      conn.release();

      return { ok: true, deletedCount: result.affectedRows };
    } catch (error) {
      logger.error('批量删除评论失败', { error });
      throw new AppError('批量删除评论失败', 500);
    }
  }
}

module.exports = CommentService;