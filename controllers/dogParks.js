const DogPark = require('../models/dogPark');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");


module.exports.index = async (req, res) => {
    const dogParks = await DogPark.find({}).populate({
        path: 'reviews',
        select: 'images'
    });
    const statesWithDogParks = await DogPark.distinct('state');
    res.render('dogParks/index', { dogParks, statesWithDogParks  });
};

module.exports.renderNewForm = (req, res) => {
    res.render('dogParks/new');
}

module.exports.createDogPark = async (req, res, next) => {
    const geoData = await geocoder.forwardGeocode({
        query: `${req.body.dogPark.city}, ${req.body.dogPark.state}`,
        limit: 1
    }).send()
    const newDogPark = new DogPark(req.body.dogPark);
    newDogPark.geometry = geoData.body.features[0].geometry;
    newDogPark.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    newDogPark.hasSmallDogArea = req.body.dogPark.hasSmallDogArea === 'true';
    newDogPark.author = req.user._id;
    await newDogPark.save();
    req.flash('success', 'Successfully made a new dogPark!');
    res.redirect(`/dogParks/${newDogPark._id}`)
}

module.exports.showDogPark = async (req, res,) => {
    const dogPark = await DogPark.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!dogPark) {
        req.flash('error', 'Cannot find that dogPark!');
        return res.redirect('/dogParks');
    }
    const dogParkJson = dogPark.toJSON();
    const allImages = dogPark.images.concat(dogPark.reviews.flatMap(review => review.images));
    res.render('dogParks/show', { dogPark: dogParkJson,allImages });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const dogPark = await DogPark.findById(id)
    if (!dogPark) {
        req.flash('error', 'Cannot find that dogPark!');
        return res.redirect('/dogParks');
    }
    res.render('dogParks/edit', { dogPark });
}

module.exports.updateDogPark = async (req, res) => {
    const { id } = req.params;
    const dogPark = await DogPark.findById(id);

    if (!dogPark) {
        req.flash('error', 'Cannot find that dogPark!');
        return res.redirect('/dogParks');
    }

    // Update the dogPark with the new values from req.body.dogPark
    Object.assign(dogPark, req.body.dogPark);

    // Update geometry based on possibly new city and state
    if(req.body.dogPark.city && req.body.dogPark.state) {
        const geoData = await geocoder.forwardGeocode({
            query: `${req.body.dogPark.city}, ${req.body.dogPark.state}`,
            limit: 1
        }).send();
        dogPark.geometry = geoData.body.features[0].geometry;
    }

    // Add new images if there are any
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    dogPark.images.push(...imgs);

    // Delete selected images
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await dogPark.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
    }

    await dogPark.save();
    req.flash('success', 'Successfully updated dogPark!');
    res.redirect(`/dogParks/${dogPark._id}`);
};


module.exports.deleteDogPark = async (req, res) => {
    const { id } = req.params;
    await DogPark.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted dogPark')
    res.redirect('/dogParks');
}

module.exports.searchDogParks = async (req, res) => {
    const { name, location } = req.query;
    const query = {};

    if (name) {
        query.title = { $regex: new RegExp(escapeRegex(name), 'i') };
    }

    if (location) {
        query.$or = [
            { city: { $regex: new RegExp(location, 'i') }},
            { state: { $regex: new RegExp(location, 'i') }}
        ];
    }

    const dogParks = await DogPark.find(query);
    res.render('dogParks/index', { dogParks });
};

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}


module.exports.filterDogParks = async (req, res) => {
    let query = DogPark.find({});

    if (req.query.minRating) {
        query = query.where('computedAverageRating').gte(req.query.minRating);
    }

    if (req.query.smallDogArea === 'true') {
        query = query.where('hasSmallDogArea').equals(true);
    }

    if (req.query.state) {
        query = query.where('state').equals(req.query.state);
    }
    const dogParks = await query.exec();

    const statesWithDogParks = await DogPark.distinct('state');
    console.log("Inside filterDogParks function");
    console.log(statesWithDogParks); // To see what it contains just before rendering

    res.render('dogParks/index', { dogParks, statesWithDogParks });
};
