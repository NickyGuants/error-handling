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
        //Custom error handler
        class AppError extends Error {
            constructor(message) {
                super();
                this.message = message;
                this.name = this.constructor.name;
                this.stack =this.stack
                this.date = moment().format('MMMM Do YYYY, h:mm:ss a');
            }
        }
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
                fs.readFile('data.jsn', (error, data) => {
                    let errors = [];

                    if (error) {
                        errors.push(error)
                        next(new AppError("File error"))
                    } else {
                        let data1 = JSON.parse(data);

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
            throw new AppError("synchronous error");
            //res.send({message: "synchromous error", date: moment().format('MMMM Do YYYY, h:mm:ss a')})
        });

        // error in asynchronous code
        this.#app.get('/panic/async', (req, res, next) => {
            Promise.reject(new AppError("asynchronous error")).catch(error => next(error));
        });

        // custom not found error
        this.#app.get('*', (req, res) => {
            throw Object.assign(new AppError('Page not found on this path: ' + req.originalUrl), {
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
            console.log(err)
            fs.appendFileSync('errors.log', JSON.stringify(err, ['name', 'message', 'stack', 'date'], 4) + '\n');
            next(err);
        });

        // - send an alert to email using sendgrid, and call next error handler
        // -Used nodemailer
        this.#app.use((err, req, res, next) => {
            const message = {
                from: {
                    name: 'Guantai',
                    address: 'gnmutembei99@gmail.com'
                },
                to: 'nicholasguantai528@gmail.com',
                subject: "ERROR NOTIFICATION",
                text: `Hello, this is to inform you that the following error has occurred in your application
                \n Name: ${err.name}\n Message: ${err.message}\n Date: ${err.date}.\n Stack: ${err.stack} \n Please investigate and fix it.\n Thank you.`,
                
            }
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