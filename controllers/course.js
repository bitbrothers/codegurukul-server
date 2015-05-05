var Course = require('../models/Course');
var User = require('../models/User');
var fs = require('fs');
var moment = require('moment');
var secret = require('../config/secrets');
var config = new secret();
var badge = require('../controllers/badge');

exports.getCourses = function(req, res) {
  var query = Course.find().select('name slug description domain price content thumb');
  query.exec(function(err, courses) {
    if (err) return err;
    res.send(courses);
  });
};

exports.canJoin = function(req, res) {
  console.log('canJoin');
  Course.findOne({
    slug: req.params.cslug
  }, function(err, course) {
    if (err) res.send(err);
    else if (!course) res.send(404).send('Course not found.');
    else {
      User.findOne(req.user._id, function(err, user) {
        if (err) res.send(err);
        else if (!user) res.status(404).send('User not found.');
        else if (user.courses.id(course._id)) res.status(412).send('Course Already Joined');
        else res.send(200);
      })
    }
  })
}

exports.getCourse = function(req, res) {
  console.log('get course');
  Course.findOne({
      slug: req.params.cslug
    })
    .populate({
      path: 'attendees._id'
    })
    .exec(function(err, course) {
      if (err)
        res.send(err);
      else if (!course) {
        res.status(404).send('Course Not Found');
      } else {
        var temp = {};
        temp.course = course;
        // if (req.user)
        //   if (course.attendees.id(req.user._id)) temp.joined = true;
        res.send(temp);
      }
    });
};

exports.joinCourse = function(req, res, next) {
  var cslug;
  if (req.params.cslug) cslug = req.params.cslug;
  if (req.body.cslug) cslug = req.body.cslug;
  console.log(cslug);
  Course.findOne({
    slug: cslug
  }, function(err, course) {
    if (err) res.send(err);
    else if (!course) res.send(404).send('Course not found.');
    else {
      console.log(req.user);
      User.findById(req.user._id, function(err, user) {
        if (err) res.send(err);
        else if (!user) res.status(404).send('User not found.');
        // else if (user.courses.id(course._id)) res.status(412).send('Course Already Joined');
        else {
          console.log(user.id);
          user.courses.push({
            _id: course._id
          });
          course.attendees.push({
            _id: user._id
          });
          course.save(function(err) {
            if (err) res.send(err);
            else {
              user.save(function(err) {
                if (err) res.send(err);
                else {
                  console.log('course joined');
                  req.pay = false;
                  req.to = user.email;
                  req.subject = 'Registration success';
                  req.email = 'You have registered for ' + course.name;
                  next();
                  badge.assign(course._id, user._id);
                }
              })
            }
          })
        }
      })
    }
  })
}