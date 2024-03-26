const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateDogPark } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const dogParks = require('../controllers/dogParks');

router.route('/')
    .get(catchAsync(dogParks.index))
    .post(isLoggedIn, upload.array('image'), validateDogPark, catchAsync(dogParks.createDogPark))

router.get('/search', catchAsync(dogParks.searchDogParks));

router.get('/filter', catchAsync(dogParks.filterDogParks));

router.get('/new', isLoggedIn, dogParks.renderNewForm)

router.route('/:id')
    .get(catchAsync(dogParks.showDogPark))
    .put(isLoggedIn, isAuthor, upload.array('image'), validateDogPark, catchAsync(dogParks.updateDogPark))
    .delete(isLoggedIn, isAuthor, catchAsync(dogParks.deleteDogPark));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(dogParks.renderEditForm))

module.exports = router;