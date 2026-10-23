const express = require('express');
const router = express.Router();
const {
  getTables,
  getTableById,
  createTable,
  updateTable,
  toggleTableStatus,
  deleteTable
} = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Secure all table routes — accessible strictly to authenticated staff (Owner & Admin)
router.use(protect);
router.use(authorize('admin', 'owner'));

router.route('/')
  .get(getTables)
  .post(createTable);

router.route('/:id')
  .get(getTableById)
  .put(updateTable)
  .delete(deleteTable);

router.patch('/:id/status', toggleTableStatus);
router.patch('/:id/toggle', toggleTableStatus);

module.exports = router;
