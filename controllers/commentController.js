const CommentService = require('../services/commentService');

class CommentController {
  constructor(pool) {
    this.commentService = new CommentService(pool);
  }

  async getComments(req, res, next) {
    try {
      const { resource_id } = req.query;
      if (!resource_id) {
        return res.status(400).json({ message: '缺少资源ID' });
      }
      const comments = await this.commentService.getCommentsByResource(resource_id);
      res.json({ items: comments });
    } catch (error) {
      next(error);
    }
  }

  async createComment(req, res, next) {
    try {
      const { username, email, content, parent_id } = req.body;
      const result = await this.commentService.createComment(
        req.params.id,
        username,
        email,
        content,
        parent_id
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: '请先登录' });
      }
      const result = await this.commentService.toggleLike(req.params.id, userId);
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getAdminComments(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const comments = await this.commentService.getAdminComments(status, parseInt(page), parseInt(limit));
      res.json(comments);
    } catch (error) {
      next(error);
    }
  }

  async approveComment(req, res, next) {
    try {
      const result = await this.commentService.approveComment(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectComment(req, res, next) {
    try {
      const result = await this.commentService.rejectComment(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const result = await this.commentService.deleteComment(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async batchDeleteComments(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await this.commentService.batchDeleteComments(ids);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CommentController;