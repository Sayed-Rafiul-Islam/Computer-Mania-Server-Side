const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());





// =-------------------------- from my DB

// user : computer-menia
// pass : ddb5yunjxkafYLSZ

const uri = "mongodb+srv://computer-menia:ddb5yunjxkafYLSZ@cluster0.m7qfs.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// --------------------------------------------

async function run() {
    try {
        await client.connect();
        const partCollection = client.db("computerMenia").collection("part");
        const orderCollection = client.db("computerMenia").collection("order");
        const reviewCollection = client.db("computerMenia").collection("review");
        const profileCollection = client.db("computerMenia").collection("profile");

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
        })

        app.get('/placeOrder/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await partCollection.findOne(query);
            res.send(result);
        })

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

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.get('/myOrders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.delete('/orders/:_id', async (req, res) => {
            const id = req.params._id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })

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

        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.put('/profile', async (req, res) => {
            const mail = req.query.email;
            const query = { email: mail };
            const options = { upsert: true };
            if (req.body.education) {
                const { displayName, email, education, linkedin, location, phone } = req.body;
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
            }
            else {
                const { email } = req.body;
                const updatedDoc = {
                    $set: {
                        email: email
                    }
                };
            }
            const result = await profileCollection.updateOne(query, updatedDoc, options);
            res.send(result);
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