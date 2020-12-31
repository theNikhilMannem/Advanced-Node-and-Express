
require('dotenv').config()
const passport = require('passport')
const bcrypt = require('bcrypt')
const LocalStrategy = require('passport-local')
const ObjectID = require('mongodb').ObjectID
const GitHubStrategy = require('passport-github').Strategy

module.exports = (app, myDataBase) => {
  passport.serializeUser((user, done) => {
    done(null, user._id)
  })
  
  passport.deserializeUser((id, done) => {
    myDataBase.findOne(
      { id: new ObjectID(id) },
      (err, doc) => {
        done(null, doc)
      }
    )
  })

  passport.use(new LocalStrategy(
    (username, password, done) => {
      myDataBase.findOne(
        { username: username },
        (err, user) => {
          if (err) return done(err)
          if (!user || !bcrypt.compareSync(password, user.password)) return done(null, false)
          return done(null, user)
        }
      )
    }
  ))

  passport.use(new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'https://repl.it/auth/github/callback'
    },
    (accessToken, refreshToken, profile, callback) => {
      console.log(accessToken, refreshToken, profile)
      myDataBase.findOneAndUpdate(
        { id: profile.id },
        {
          $setOnInsert: {
            id: profile.id,
            name: profile.displayName || 'Nikhil M Kumar',
            photo: profile.photos[0].value || '',
            email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
            created_on: new Date(),
            provider: profile.provider || ''
          },
          $set: {
            last_login: new Date()
          },
          $inc: {
            login_count: 1
          }
        },
        { upsert: true, new: true },
        (err, doc) => {
          return cb(null, doc.value)
        }
      )
    }
  ))
}