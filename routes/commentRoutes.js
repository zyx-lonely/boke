const express = require('express');
const CommentController = require('../controllers/commentController');
const { validate, commentValidations } = require('../middleware/validation');

const createCommentRoutes = (pool, authMiddleware, adminMiddleware) => {
  const router = express.Router();
  const controller = new CommentController(pool);

  router.get('/api/comments', controller.getComments.bind(controller));

  router.get('/api/resources/:id/comments', async (req, res, next) => {
    try {
      const { resource_id } = { resource_id: req.params.id };
      const comments = await controller.commentService.getCommentsByResource(resource_id);
      res.json(comments);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/api/resources/:id/comments',
    validate(commentValidations),
    controller.createComment.bind(controller)
  );
  
  router.post('/api/comments/:id/like', authMiddleware, controller.toggleLike.bind(controller));
  
  router.get('/api/admin/comments', authMiddleware, adminMiddleware, controller.getAdminComments.bind(controller));
  
  router.put('/api/admin/comments/:id/approve', authMiddleware, adminMiddleware, controller.approveComment.bind(controller));
  
  router.put('/api/admin/comments/:id/reject', authMiddleware, adminMiddleware, controller.rejectComment.bind(controller));
  
  router.delete('/api/admin/comments/batch', authMiddleware, adminMiddleware, controller.batchDeleteComments.bind(controller));
  
  router.delete('/api/admin/comments/:id', authMiddleware, adminMiddleware, controller.deleteComment.bind(controller));

  return router;
};

module.exports = createCommentRoutes;