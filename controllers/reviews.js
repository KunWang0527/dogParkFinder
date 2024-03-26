const DogPark = require('../models/dogPark');
const Review = require('../models/review');

function calculateAverageRating(reviews) {
    if (reviews.length > 0) {
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      return sum / reviews.length;
    }
    return 0;
  }

module.exports.createReview = async (req, res) => {
    const dogPark = await DogPark.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    if(req.files) {
        review.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    }
    dogPark.reviews.push(review);
    await review.save();
    dogPark.computedAverageRating = calculateAverageRating(dogPark.reviews.concat(review));
    await dogPark.save();
    req.flash('success', 'Created new review!');
    res.redirect(`/dogParks/${dogPark._id}`);
};

module.exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;
    await DogPark.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully deleted review')
    res.redirect(`/dogParks/${id}`);
}

module.exports.renderNewReviewForm = async(req, res) => {
    const { id } = req.params;
    const dogPark = await DogPark.findById(id)
    if (!dogPark) {
        req.flash('error', 'Cannot find that dog park.');
        return res.redirect('/dogParks');
    }
    res.render('reviews/new', {dogPark});
};
