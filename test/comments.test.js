const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const testToken = jwt.sign(
  { id: 1, username: 'testuser', role: 'user' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

describe('评论接口测试', () => {
  describe('GET /api/comments', () => {
    it('缺少resource_id参数应返回400', async () => {
      const response = await request(app).get('/api/comments');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', '缺少资源ID');
    });

    it('无效的resource_id应返回空数组', async () => {
      const response = await request(app).get('/api/comments?resource_id=99999');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('有效的resource_id应返回评论列表', async () => {
      const response = await request(app).get('/api/comments?resource_id=1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('POST /api/comments/:id/like', () => {
    it('未登录应返回401', async () => {
      const response = await request(app).post('/api/comments/99999/like');
      expect(response.status).toBe(401);
    });

    it('不存在的评论ID应返回404', async () => {
      const response = await request(app)
        .post('/api/comments/99999/like')
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error.message', '评论不存在');
    });

    it('有效的评论ID应成功点赞', async () => {
      const createRes = await request(app)
        .post('/api/resources/1/comments')
        .send({ username: 'testuser', content: '测试评论' });
      const commentId = createRes.body.id;

      const response = await request(app)
        .post(`/api/comments/${commentId}/like`)
        .set('Authorization', `Bearer ${testToken}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('likes');
      expect(typeof response.body.likes).toBe('number');
    });
  });

  describe('POST /api/resources/:id/comments', () => {
    it('缺少用户名应返回400', async () => {
      const response = await request(app)
        .post('/api/resources/1/comments')
        .send({ content: '测试评论' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('message', '用户名不能为空');
    });

    it('缺少评论内容应返回400', async () => {
      const response = await request(app)
        .post('/api/resources/1/comments')
        .send({ username: 'testuser' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('message', '评论内容不能为空');
    });

    it('不存在的资源ID应返回404', async () => {
      const response = await request(app)
        .post('/api/resources/99999/comments')
        .send({ username: 'testuser', content: '测试评论' });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error.message', '资源不存在');
    });

    it('有效的评论应成功创建', async () => {
      const response = await request(app)
        .post('/api/resources/1/comments')
        .send({ username: 'testuser', content: '测试评论内容' });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(typeof response.body.id).toBe('number');
    });
  });
});