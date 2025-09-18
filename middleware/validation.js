const { z } = require('zod');

// Create: name required. Update: partial allowed.
const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional().default(''),
  imageUrl: z.string().url().max(300).optional().or(z.literal('')),
});

// For updates allow any subset but disallow empty body
const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'at_least_one_field_required',
});

function validateStyleCreate(req, res, next) {
  const parse = createSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parse.error.issues });
  }
  req.validatedBody = parse.data;
  next();
}

function validateStyleUpdate(req, res, next) {
  const parse = updateSchema.safeParse(req.body || {});
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid_payload', details: parse.error.issues });
  }
  req.validatedBody = parse.data;
  next();
}

module.exports = { validateStyleCreate, validateStyleUpdate };
