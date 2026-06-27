const express = require('express');
const searchController = require('../controllers/searchController');
const protect = require('../middlewares/protect');

const router = express.Router();

router.use(protect);
router.get('/', searchController.search);

module.exports = router;
