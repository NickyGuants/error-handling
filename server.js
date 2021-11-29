const express = require('express');
const fs = require('fs');
const port = 3005;
const sendEmail = require('./email');
const message = require('./message');
const moment = require('moment')

class Application {

    /**
     * express application
     * 
     * @private
     * @type {Express}
     */
    #app = express();

    /**
     * build application instance
     * 
     * @constructor
     */
    constructor() {
        this.#middlewares();
        this.#routes();
        this.#errors();
    }

    /**
     * global middlewares
     * 
     * @private
     * @returns {undefined}
     */
    #middlewares() {
        this.#app.use(express.json());
        this.#app.use(express.urlencoded({
            extended: true
        }));
    }

    /**
     * add routes
     * 
     * @private
     * @returns {undefined}
     */
    #routes() {
        // form validation using a middleware
        this.#app.post(
            '/register',
            (req, res, next) => {
                let data = JSON.parse(fs.readFileSync('data.json'));
                let errors = [];
                
                if (Object.values(data).includes(req.body.email)) {
                    errors.push({
                        email: 'email must be unique'
                    });
                }
                if (req.body.password !== req.body.confirmPassword) {
                    errors.push({
                        password: 'passwords do not match'
                    });
                }

                errors.length ? res.status(422).send(errors) : next();
            },
            (req, res) => res.status(200).send('Thank you for registering')
        );

        // - login user using email address only
        // - get list of user emails from data.json asynchronously, and catch any errors
        // - if login email is not found in list of user emails then send failed response with correct status code
        // - send success response if user is found
        this.#app.post(
            '/login',
            (req, res, next) => {
                fs.readFile('data.json', (error, data) => {
                    let errors = [];

                    if (error) {
                        errors.push(error)
                        console.log(error)
                    } else {
                        let data1 = JSON.parse(data);
                        console.log(data1)

                        if (!Object.values(data1).includes(req.body.email))
                        errors.push({
                            email: 'email does not exist'
                        });
                        
                        errors.length ? res.status(422).send(errors) : next(); 
                    }    
                })
                
            },(req, res) => res.status(200).send('logged in successfully')
            
        );

        // error in synchronous code
        this.#app.get('/panic/sync', (req, res) => {
            throw new Error("synchronous error");
            //res.send({message: "synchromous error", date: moment().format('MMMM Do YYYY, h:mm:ss a')})
        });

        // error in asynchronous code
        this.#app.get('/panic/async', (req, res, next) => {
            Promise.reject(new Error("asynchronous error")).catch(error => next(error));
        });

        // custom not found error
        this.#app.get('*', (req, res) => {
            throw Object.assign(new Error('Page not found on this path: ' + req.originalUrl), {
                name: 404
            });
        });
    }

    /**
     * handle errors
     * 
     * @private
     * @returns {undefined}
     */
    #errors() {
        // write to log file
        this.#app.use((err, req, res, next) => {
            // - add timestamp to error logs
            //console.log()
            fs.appendFileSync('errors.log', JSON.stringify(err, ['name', 'message', 'stack'], 4) + '\n');
            next(err);
        });

        // - send an alert to email using sendgrid, and call next error handler
        // -Used nodemailer
        this.#app.use((err, req, res, next)=>{
            sendEmail(message)
            res.send("email sent")
            next(err);
        })

        // not found error
        this.#app.use((err, req, res, next) => {
            err.name == 404
                ? res.status(404).send(err.message || 'Oops! Resource not found')
                : next(err);
        });

        // default server error
        this.#app.use((err, req, res, next) => {
            res.status(500).send(err.message || 'Oops! Server failed');
        });
    }

    /**
     * launch server
     * 
     * @public
     * @returns {undefined}
     */
    serve() {
        this.#app.listen(port, () => console.log('server running on:', port));
    }
}

new Application().serve();