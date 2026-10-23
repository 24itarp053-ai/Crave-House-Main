const Table = require('../models/Table');
const Reservation = require('../models/Reservation');
const mongoose = require('mongoose');

/**
 * Helper to compute real-time status of a table based on current reservations
 */
function computeCurrentTableStatus(table, activeReservationsNow) {
  if (!table.isActive) {
    return 'Maintenance';
  }

  const matchingRes = activeReservationsNow.find((r) =>
    (r.tableId && r.tableId.toString() === table._id.toString()) ||
    (r.table && r.table.toUpperCase() === table.tableNumber.toUpperCase())
  );

  if (!matchingRes) {
    return 'Available';
  }

  return matchingRes.status === 'Confirmed' ? 'Occupied' : 'Reserved';
}

/**
 * GET /api/tables
 * List all tables with computed live status based on current active bookings
 * Access: Private (Admin / Owner)
 */
exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find({}).sort({ tableNumber: 1 });

    // Find active reservations for today to determine live status
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const todayReservations = await Reservation.find({
      date: todayStr,
      status: { $in: ['Pending', 'Confirmed'] }
    });

    // Filter reservations active right now (within slot window)
    const activeReservationsNow = todayReservations.filter(r => {
      if (!r.time) return false;
      const [h, m] = r.time.split(':').map(Number);
      const startMin = h * 60 + (m || 0);
      const duration = r.durationMinutes || 90;
      const endMin = startMin + duration;
      return currentMinutes >= startMin && currentMinutes < endMin;
    });

    const tablesWithStatus = tables.map(table => {
      const liveStatus = computeCurrentTableStatus(table, activeReservationsNow);
      return {
        ...table.toObject(),
        liveStatus,
        // Status property for compatibility with existing UI badge
        status: liveStatus
      };
    });

    res.status(200).json({
      success: true,
      count: tablesWithStatus.length,
      tables: tablesWithStatus
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving tables'
    });
  }
};

/**
 * GET /api/tables/:id
 * Retrieve a specific table by ID
 * Access: Private (Admin / Owner)
 */
exports.getTableById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID format'
      });
    }

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.status(200).json({
      success: true,
      table
    });
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving table'
    });
  }
};

/**
 * POST /api/tables
 * Create a new table
 * Access: Private (Admin / Owner)
 */
exports.createTable = async (req, res) => {
  try {
    const { tableNumber, name, capacity, area, description, isActive } = req.body;

    if (!tableNumber || !tableNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required'
      });
    }

    const cleanTableNumber = tableNumber.trim().toUpperCase();

    // Check for duplicate table number
    const existing = await Table.findOne({ tableNumber: cleanTableNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Table "${cleanTableNumber}" already exists`
      });
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be at least 1 guest'
      });
    }
    if (capNum > 50) {
      return res.status(400).json({
        success: false,
        message: 'Capacity cannot exceed 50 guests'
      });
    }

    const table = await Table.create({
      tableNumber: cleanTableNumber,
      name: name && name.trim() ? name.trim() : `Table ${cleanTableNumber}`,
      capacity: capNum,
      area: area || 'Main Hall',
      description: description ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      table
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A table with this number already exists'
      });
    }
    console.error('Error creating table:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating table'
    });
  }
};

/**
 * PUT /api/tables/:id
 * Update table properties
 * Access: Private (Admin / Owner)
 */
exports.updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID format'
      });
    }

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const { tableNumber, name, capacity, area, description, isActive } = req.body;

    if (tableNumber) {
      const cleanTableNumber = tableNumber.trim().toUpperCase();
      if (cleanTableNumber !== table.tableNumber) {
        const duplicate = await Table.findOne({
          tableNumber: cleanTableNumber,
          _id: { $ne: table._id }
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Table "${cleanTableNumber}" already exists`
          });
        }
        table.tableNumber = cleanTableNumber;
      }
    }

    if (name !== undefined) table.name = name.trim();
    if (capacity !== undefined) {
      const capNum = parseInt(capacity, 10);
      if (isNaN(capNum) || capNum < 1 || capNum > 50) {
        return res.status(400).json({
          success: false,
          message: 'Capacity must be between 1 and 50 guests'
        });
      }
      table.capacity = capNum;
    }
    if (area !== undefined) table.area = area;
    if (description !== undefined) table.description = description.trim();
    if (isActive !== undefined) table.isActive = Boolean(isActive);

    await table.save();

    res.status(200).json({
      success: true,
      message: 'Table updated successfully',
      table
    });
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating table'
    });
  }
};

/**
 * PATCH /api/tables/:id/status
 * Toggle or set table active/inactive status
 * Access: Private (Admin / Owner)
 */
exports.toggleTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID format'
      });
    }

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Toggle if not explicitly specified
    if (req.body.isActive !== undefined) {
      table.isActive = Boolean(req.body.isActive);
    } else {
      table.isActive = !table.isActive;
    }

    await table.save();

    res.status(200).json({
      success: true,
      message: `Table ${table.tableNumber} is now ${table.isActive ? 'Active' : 'Inactive'}`,
      table
    });
  } catch (error) {
    console.error('Error toggling table status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating table status'
    });
  }
};

/**
 * DELETE /api/tables/:id
 * Delete a table only when doing so cannot corrupt reservation history
 * Access: Private (Admin / Owner)
 */
exports.deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID format'
      });
    }

    const table = await Table.findById(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Check if table has active, upcoming, or past reservations
    const hasReservations = await Reservation.exists({
      $or: [
        { tableId: table._id },
        { table: table.tableNumber }
      ]
    });

    if (hasReservations) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete table "${table.tableNumber}" because it has existing reservation records. Deactivate the table instead to preserve reservation history.`
      });
    }

    await Table.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Table "${table.tableNumber}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting table'
    });
  }
};
