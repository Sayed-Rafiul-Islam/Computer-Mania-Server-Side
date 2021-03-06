const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, Transaction } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());





// =-------------------------- from my DB


const uri = "mongodb+srv://computer-menia:ddb5yunjxkafYLSZ@cluster0.m7qfs.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// --------------------------------------------

async function run() {
    try {
        await client.connect();

        function varifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            console.log(authHeader)
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET
                , (err, decoded) => {
                    if (err) {
                        return res.status(403).send({ message: 'Forbidden access' });
                    }
                    req.decoded = decoded;

                    next();
                })
        }

        const partCollection = client.db("computerMenia").collection("part");
        const orderCollection = client.db("computerMenia").collection("order");
        const reviewCollection = client.db("computerMenia").collection("review");
        const profileCollection = client.db("computerMenia").collection("profile");
        const paymentCollection = client.db("computerMenia").collection("payment");

        // ?load computer parts 
        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts.reverse());
        })

        // delete a product 
        app.delete('/parts/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.deleteOne(query);
            res.send(result);
        })

        // get the order that user wants to order
        app.get('/placeOrder/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.findOne(query);
            res.send(result);
        })

        // update the quantity of that product after being ordered
        app.put('/placeOrder/:_id', async (req, res) => {
            const id = req.params._id;
            const updatedQuantity = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    quantity: updatedQuantity.updatedQuantity
                }
            };
            const result = await partCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //  orders stored
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        // loaf specific order for an user
        app.get('/myOrders', varifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' })
            }
        })

        //  load all orders of all users
        app.get('/allOrders', async (req, res) => {
            const query = {};
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        // update ship status
        app.put('/allOrders/:_id', async (req, res) => {
            const id = req.params._id;
            const shipStatus = req.body;
            console.log(shipStatus)
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: shipStatus
            };
            const result = await orderCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        // remove an order 
        app.delete('/orders/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

        // add a review or update it
        app.put('/review', async (req, res) => {
            const mail = req.query.email;
            const { displayName, rating, experience, email } = req.body;
            const query = { email: mail };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    email: email,
                    displayName: displayName,
                    rating: rating,
                    experience: experience
                }
            };
            const result = await reviewCollection.updateOne(query, updatedDoc, options);
            res.send(result);
        })

        // load  home page  reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        // update profile
        app.put('/profile', async (req, res) => {
            const mail = req.query.email;
            const query = { email: mail };
            if (req.body.education) {
                const { displayName, email, education, linkedin, location, phone } = req.body;
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        email: email,
                        displayName: displayName,
                        education: education,
                        linkedin: linkedin,
                        location: location,
                        phone: phone
                    }
                };
                const result = await profileCollection.updateOne(query, updatedDoc, options);
                res.send(result);
            }
            else {
                const { email, displayName } = req.body;
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        email: email,
                        displayName: displayName
                    }
                };
                const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                const result = await profileCollection.updateOne(query, updatedDoc, options);
                res.send({ result, token });
            }
        })

        // store all the profiles
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await profileCollection.find(query).toArray();
            res.send(users)
        })

        //  grant an user admin level access
        app.put('/makeAdmin', varifyJWT, async (req, res) => {
            const email = req.query.email;
            const requester = req.decoded.email
            const query1 = { email: requester };
            const requesterAccount = await profileCollection.findOne(query1);

            if (requesterAccount.role === 'admin') {
                const { role } = req.body;
                const query = { email: email };
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        role: role
                    }
                };
                const result = await profileCollection.updateOne(query, updatedDoc, options);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }

        })

        // request check if the requester has admin level access or not
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await profileCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        //  add a new product
        app.post('/newPart', async (req, res) => {
            const newPart = req.body;
            const result = await partCollection.insertOne(newPart);
            res.send(result);
        })

        //  payment for specific order load
        app.get('/payment/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);
        })

        // update payment status and get payment sectret
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = parseInt(price) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({ clientSecret: paymentIntent.client_secret });
        });

        // store payment history 
        app.put('/payment/:_id', async (req, res) => {
            const id = req.params._id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            };
            const result = await paymentCollection.insertOne(payment);
            const updateOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedDoc);


        })


    }
    finally {

    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('running ')
})
app.listen(port, () => {
    console.log('crud is running')
})