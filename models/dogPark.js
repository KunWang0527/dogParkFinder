const mongoose = require('mongoose');
const Review = require('./review')
const Schema = mongoose.Schema;

const statesEnum = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };


const dogParkSchema = new Schema({
    title: String,
    images: [ImageSchema],
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    computedAverageRating: {
        type: Number,
        default: 0
    },
    hasSmallDogArea: Boolean,
    description: String,
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        enum: statesEnum,
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'
    }]
}, opts);


// Add a virtual for the average rating
dogParkSchema.virtual('averageRating').get(function() {
    if (this.reviews.length > 0) {
      let sum = 0;
      for (let i = 0; i < this.reviews.length; i++) {
        sum += this.reviews[i].rating;
      }
      return sum / this.reviews.length;
    }
    return 0; // Return 0 if there are no reviews
  });
  
  // Add a virtual for the count of reviews
  dogParkSchema.virtual('reviewCount').get(function() {
    return this.reviews.length;
  });

dogParkSchema.virtual('properties.popUpMarkup').get(function () {
    return `
    <strong><a href="/dogParks/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});

dogParkSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})



module.exports = mongoose.model('dogPark', dogParkSchema);