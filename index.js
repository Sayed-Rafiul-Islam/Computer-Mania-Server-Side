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

        app.get('/parts', async (req, res) => {
            const query = {};
            const cursor = partCollection.find(query);
            const parts = await cursor.toArray();
            res.send(parts);
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