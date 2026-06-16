const { validationResult, body } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      errors: errors.array().map(err => ({
        field: err.field,
        message: err.msg
      }))
    });
  };
};

const commentValidations = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('content').notEmpty().withMessage('评论内容不能为空'),
  body('parent_id').optional().isInt({ min: 1 }).withMessage('parent_id必须是正整数')
];

const loginValidations = [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
];

const resourceValidations = [
  body('title').notEmpty().withMessage('标题不能为空'),
  body('summary').notEmpty().withMessage('简介不能为空'),
  body('category_id').notEmpty().withMessage('分类不能为空')
];

module.exports = { 
  validate, 
  commentValidations, 
  loginValidations, 
  resourceValidations 
};