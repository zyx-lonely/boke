const { logger } = require('../middleware/logger');
const { AppError } = require('../middleware/errorHandler');
const { sendCommentNotification } = require('./emailService');
const { createNotification } = require('../routes/notificationRoutes');

class CommentService {
  constructor(pool) {
    this.pool = pool;
  }

  async _withConn(fn) {
    const conn = await this.pool.getConnection();
    try {
      return await fn(conn);
    } finally {
      conn.release();
    }
  }

  async getCommentsByResource(resourceId) {
    try {
      return await this._withConn(async (conn) => {
        const [rows] = await conn.query(
          `SELECT c.*, COALESCE(cl_cnt.likes, 0) AS likes
           FROM comments c
           LEFT JOIN (SELECT comment_id, COUNT(*) AS likes FROM comment_likes GROUP BY comment_id) cl_cnt ON c.id = cl_cnt.comment_id
           WHERE c.resource_id = ? AND c.status = 'approved'
           ORDER BY c.created_at DESC
           LIMIT 1000`,
          [resourceId]
        );
        return rows;
      });
    } catch (error) {
      logger.error('获取评论失败', { error });
      throw new AppError('获取评论失败', 500);
    }
  }

  async createComment(resourceId, username, email, content, parentId = null) {
    return this._withConn(async (conn) => {
      const [resourceRows] = await conn.query(`SELECT id FROM resources WHERE id = ?`, [resourceId]);
      if (resourceRows.length === 0) {
        throw new AppError('资源不存在', 404);
      }

      if (parentId) {
        const [parentRows] = await conn.query(`SELECT id FROM comments WHERE id = ?`, [parentId]);
        if (parentRows.length === 0) {
          throw new AppError('父评论不存在', 404);
        }
      }

      const [result] = await conn.query(
        `INSERT INTO comments (resource_id, username, email, content, parent_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [resourceId, username, email, content, parentId, 'pending']
      );

      if (parentId) {
        try {
          const [parentRows] = await conn.query('SELECT user_id, username FROM comments c JOIN users u ON c.username = u.username WHERE c.id = ?', [parentId]);
          if (parentRows.length > 0 && parentRows[0].username !== username) {
            const userId = parentRows[0].user_id;
            const [resRows] = await conn.query('SELECT title FROM resources WHERE id = ?', [resourceId]);
            const resTitle = resRows[0]?.title || '资源';
            createNotification(this.pool, userId, 'comment_reply', `有人回复了您的评论`,
              `${username} 回复了您在《${resTitle}》中的评论：${content?.slice(0, 100)}`,
              `/detail/${resourceId}`);
          }
        } catch (e) { logger.warn('创建通知失败', { error: e.message }); }
      }

      return { id: result.insertId };
    });
  }

  async toggleLike(commentId, userId = 0) {
    return this._withConn(async (conn) => {
      const [checkRows] = await conn.query(`SELECT id FROM comments WHERE id = ?`, [commentId]);
      if (checkRows.length === 0) {
        throw new AppError('评论不存在', 404);
      }

      const [likeRows] = await conn.query(
        `SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?`,
        [commentId, userId]
      );

      let isLiked;

      if (likeRows.length > 0) {
        await conn.query(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId]);
        isLiked = false;
      } else {
        await conn.query(`INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, [commentId, userId]);
        isLiked = true;
      }

      const [countRows] = await conn.query(`SELECT COUNT(*) AS cnt FROM comment_likes WHERE comment_id = ?`, [commentId]);
      const newLikes = countRows[0].cnt;

      return { likes: newLikes, liked: isLiked };
    });
  }

  async getAdminComments(status = '', page = 1, limit = 20) {
    return this._withConn(async (conn) => {
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

      return {
        items: rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    });
  }

  async approveComment(id) {
    return this._withConn(async (conn) => {
      const [commentRows] = await conn.query(
        `SELECT c.*, r.title as resource_title FROM comments c LEFT JOIN resources r ON c.resource_id = r.id WHERE c.id = ?`, [id]
      );
      if (commentRows.length === 0) { throw new AppError('评论不存在', 404); }

      await conn.query(`UPDATE comments SET status = 'approved' WHERE id = ?`, [id]);

      const c = commentRows[0];
      if (c.email) {
        sendCommentNotification(this.pool, c.email, c.username, c.resource_title, 'approved', c.content)
          .catch(e => logger.warn('发送审核通知邮件失败', { error: e.message }));
      }

      return { ok: true };
    });
  }

  async rejectComment(id) {
    return this._withConn(async (conn) => {
      const [commentRows] = await conn.query(
        `SELECT c.*, r.title as resource_title FROM comments c LEFT JOIN resources r ON c.resource_id = r.id WHERE c.id = ?`, [id]
      );
      if (commentRows.length === 0) { throw new AppError('评论不存在', 404); }

      await conn.query(`UPDATE comments SET status = 'rejected' WHERE id = ?`, [id]);

      const c = commentRows[0];
      if (c.email) {
        sendCommentNotification(this.pool, c.email, c.username, c.resource_title, 'rejected', c.content)
          .catch(e => logger.warn('发送审核通知邮件失败', { error: e.message }));
      }

      return { ok: true };
    });
  }

  async deleteComment(id) {
    return this._withConn(async (conn) => {
      const [result] = await conn.query(`DELETE FROM comments WHERE id = ?`, [id]);
      if (result.affectedRows === 0) {
        throw new AppError('评论不存在', 404);
      }
      return { ok: true };
    });
  }

  async batchDeleteComments(ids) {
    return this._withConn(async (conn) => {
      const [result] = await conn.query(`DELETE FROM comments WHERE id IN (?)`, [ids]);
      return { ok: true, deletedCount: result.affectedRows };
    });
  }
}

module.exports = CommentService;
