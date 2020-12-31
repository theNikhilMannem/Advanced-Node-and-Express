
const passport = require('passport')
const bcrypt = require('bcrypt')

module.exports = (app, myDataBase) => {
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    })
  })

  app.route('/auth/github')
  .get(passport.authenticate('github'))

  app.route('/auth/github/callback')
  .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    req.session.user_id = req.user.id
    res.redirect('/chat')
  })

  app.route('/register')
  .post((req, res, next) => {
    myDataBase.findOne(
      { username: req.body.username },
      (err, user) => {
        if (err) next(err)
        if (user) res.redirect('/')
        else myDataBase.insertOne(
          {
            username: req.body.username,
            password: bcrypt.hashSync(req.body.password)
          },
          (err, userCreated) => {
            if (err) res.redirect('/')
            else console.log(userCreated)
          }
        )
      }
    )
  },
  passport.authenticate('local', { failureRedirect: '/' }), (req, res, next) => {
    res.redirect('/profile')
    next()
  })

  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile')
  })

  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', { username: req.user.username })
  })

  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/chat', { user: res.user })
  })

  app.route('/logout').get((req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.use((req, res, next) => {
    res.status(404)
    .type('text')
    .send('Not Found')
  })
}

// Creating a neew Middleware to check if the user is authenticated!
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
}