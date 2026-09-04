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
    .withMessage('Name must contain only alphabets')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name must contain only alphabets'),

  body('mobile')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .matches(/^[789]\d{9}$/)
    .withMessage('Mobile number must be 10 digits and start with 7, 8, or 9'),

  body('dob')
    .trim()
    .notEmpty()
    .withMessage('Date of birth is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date of birth must be in YYYY-MM-DD format')
    .custom((val) => {
      const parts = val.split('-').map(Number);
      if (parts.length !== 3) {
        throw new Error('Date of birth must be in YYYY-MM-DD format');
      }
      const [year, month, day] = parts;
      const parsed = new Date(year, month - 1, day);
      if (
        parsed.getFullYear() !== year ||
        parsed.getMonth() !== month - 1 ||
        parsed.getDate() !== day
      ) {
        throw new Error('Invalid date value');
      }

      const today = new Date();
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (parsed > todayDateOnly) {
        throw new Error('Date of birth cannot be in the future');
      }

      let age = today.getFullYear() - parsed.getFullYear();
      const monthDiff = today.getMonth() - parsed.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
        age--;
      }

      if (age < 13) {
        throw new Error('You must be at least 13 years old');
      }

      return true;
    }),

  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .matches(/^[a-zA-Z0-9_]{3,50}$/)
    .withMessage('Username must be 3-50 chars, letters/numbers/underscore only'),

  validateRequest,
];
