const assert = require('assert');
const sinon = require('sinon');
const CommentService = require('../services/commentService');
const { AppError } = require('../middleware/errorHandler');

describe('CommentService', () => {
  let pool;
  let service;
  let connection;

  beforeEach(() => {
    connection = {
      query: sinon.stub().resolves([[]]),
      release: sinon.stub()
    };
    pool = {
      getConnection: sinon.stub().resolves(connection)
    };
    service = new CommentService(pool);
  });

  describe('getCommentsByResource', () => {
    it('should return comments for a resource', async () => {
      const mockComments = [{ id: 1, content: 'test' }];
      connection.query.resolves([mockComments]);

      const result = await service.getCommentsByResource(1);

      assert.deepStrictEqual(result, mockComments);
      assert(connection.query.calledOnce);
      assert(connection.release.calledOnce);
    });

    it('should throw AppError on database error', async () => {
      connection.query.rejects(new Error('DB error'));

      await assert.rejects(
        service.getCommentsByResource(1),
        AppError
      );
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      connection.query.onFirstCall().resolves([[{ id: 1 }]]);
      connection.query.onSecondCall().resolves([{ insertId: 1 }]);

      const result = await service.createComment(1, 'user', 'email', 'content');

      assert.deepStrictEqual(result, { id: 1 });
    });

    it('should throw AppError if resource not found', async () => {
      connection.query.resolves([[]]);

      await assert.rejects(
        service.createComment(999, 'user', 'email', 'content'),
        { message: '资源不存在' }
      );
    });

    it('should throw AppError if parent comment not found', async () => {
      connection.query.onFirstCall().resolves([[{ id: 1 }]]);
      connection.query.onSecondCall().resolves([[]]);

      await assert.rejects(
        service.createComment(1, 'user', 'email', 'content', 999),
        { message: '父评论不存在' }
      );
    });
  });

  describe('toggleLike', () => {
    it('should add like if not liked', async () => {
      connection.query.onCall(0).resolves([[{ id: 1, likes: 0 }]]);
      connection.query.onCall(1).resolves([[]]);
      connection.query.onCall(2).resolves([{ insertId: 1 }]);
      connection.query.onCall(3).resolves([{ affectedRows: 1 }]);

      const result = await service.toggleLike(1, 1);

      assert.deepStrictEqual(result, { likes: 1, liked: true });
    });

    it('should remove like if already liked', async () => {
      connection.query.onCall(0).resolves([[{ id: 1, likes: 1 }]]);
      connection.query.onCall(1).resolves([[{ id: 1 }]]);
      connection.query.onCall(2).resolves([{ affectedRows: 1 }]);
      connection.query.onCall(3).resolves([{ affectedRows: 1 }]);

      const result = await service.toggleLike(1, 1);

      assert.deepStrictEqual(result, { likes: 0, liked: false });
    });

    it('should throw AppError if comment not found', async () => {
      connection.query.resolves([[]]);

      await assert.rejects(
        service.toggleLike(999, 1),
        { message: '评论不存在' }
      );
    });
  });

  describe('approveComment', () => {
    it('should approve a comment', async () => {
      connection.query.resolves([{ affectedRows: 1 }]);

      const result = await service.approveComment(1);

      assert.deepStrictEqual(result, { ok: true });
    });

    it('should throw AppError if comment not found', async () => {
      connection.query.resolves([{ affectedRows: 0 }]);

      await assert.rejects(
        service.approveComment(999),
        { message: '评论不存在' }
      );
    });
  });

  describe('rejectComment', () => {
    it('should reject a comment', async () => {
      connection.query.resolves([{ affectedRows: 1 }]);

      const result = await service.rejectComment(1);

      assert.deepStrictEqual(result, { ok: true });
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      connection.query.resolves([{ affectedRows: 1 }]);

      const result = await service.deleteComment(1);

      assert.deepStrictEqual(result, { ok: true });
    });
  });

  describe('batchDeleteComments', () => {
    it('should delete multiple comments', async () => {
      connection.query.resolves([{ affectedRows: 2 }]);

      const result = await service.batchDeleteComments([1, 2]);

      assert.deepStrictEqual(result, { ok: true, deletedCount: 2 });
    });
  });
});