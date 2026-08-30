import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate.middleware';

export const updateProfileValidator = [
  body('email')
    .not()
    .exists()
    .withMessage('Email cannot be updated via profile update'),

  body('userId')
    .not()
    .exists()
    .withMessage('Client cannot specify userId in payload'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be at most 100 characters'),

  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[0-9+]{7,20}$/)
    .withMessage('Mobile number must be between 7 and 20 digits and can include leading +'),

  body('dob')
    .trim()
    .notEmpty()
    .withMessage('Date of birth is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date of birth must be in YYYY-MM-DD format')
    .custom((val) => {
      const parsed = new Date(val);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date value');
      }
      if (parsed > new Date()) {
        throw new Error('Date of birth cannot be in the future');
      }
      return true;
    }),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain alphanumeric characters and underscores'),

  validateRequest,
];
