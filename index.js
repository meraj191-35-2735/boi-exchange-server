const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { query, response } = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// database connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rhgolmx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UNAUTHORIZED access!" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "FORBIDDEN access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const bookCollection = client.db("boi_exchange").collection("books");
    const userCollection = client.db("boi_exchange").collection("users");
    const exchangeCollection = client.db("boi_exchange").collection("exchange");
    const borrowCollection = client.db("boi_exchange").collection("borrow");

    //**********************
    //       Exchange
    //**********************

    //All available books for exchange
    app.get("/exchange", async (req, res) => {
      const query = {};
      const cursor = exchangeCollection.find(query);
      const books = await cursor.toArray();
      res.send(books);
    });
    // Add book to Exchange
    app.post("/exchange", async (req, res) => {
      const book = req.body;
      const query = {
        name: book.name,
        category: book.category,
        writter: book.writter,
        image: book.image,
        interestedBooksType: book.interestedBooksType,
        userName: book.userName,
        userEmail: book.userEmail,
        userLocation: book.userLocation,
        userContact: book.userContact,
      };
      const result = await exchangeCollection.insertOne(query);
      res.send(result);
    });
    //My Added Books for exchange
    app.get("/exchange/:mail", async (req, res) => {
      const email = req.params.mail;
      const query = { userEmail: email };
      const cursor = exchangeCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Acceptance Page for exchange
    app.get("/exchange/book/:bookId", async (req, res) => {
      const id = req.params.bookId;
      const query = { _id: ObjectId(id) };
      const result = await exchangeCollection.findOne(query);
      res.send(result);
    });
    // Send Request for exchange
    app.put("/exchange/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requesterDetails: requester,
        },
      };
      const result = await exchangeCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Acceptance Result for exchange
    app.put("/exchange/accept/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requestResult: requester,
          accept: true,
        },
        $unset: {
          requesterDetails: null,
        },
      };
      const result = await exchangeCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Rejection Result for exchange
    app.put("/exchange/reject/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requestResult: requester,
          accept: false,
        },
        $unset: {
          requesterDetails: null,
        },
      };
      const result = await exchangeCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Delete Book from Exchange
    app.delete("/exchange/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await exchangeCollection.deleteOne(query);
      res.send(result);
    });

    //**********************
    //       Borrow
    //**********************

    //All available books for exchange
    app.get("/borrow", async (req, res) => {
      const query = {};
      const cursor = borrowCollection.find(query);
      const books = await cursor.toArray();
      res.send(books);
    });
    //Add Book to Borrow
    app.post("/borrow", async (req, res) => {
      const book = req.body;
      const query = {
        name: book.name,
        category: book.category,
        writter: book.writter,
        image: book.image,
        duration: book.duration,
        userName: book.userName,
        userEmail: book.userEmail,
        userLocation: book.userLocation,
        userContact: book.userContact,
      };
      const result = await borrowCollection.insertOne(query);
      res.send(result);
    });
    //My Added Books for Borrow
    app.get("/borrow/:mail", async (req, res) => {
      const email = req.params.mail;
      const query = { userEmail: email };
      const cursor = borrowCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Acceptance Page for Borrow
    app.get("/borrow/book/:bookId", async (req, res) => {
      const id = req.params.bookId;
      const query = { _id: ObjectId(id) };
      const result = await borrowCollection.findOne(query);
      res.send(result);
    });
    // Send Request for Borrow
    app.put("/borrow/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requesterDetails: requester,
        },
      };
      const result = await borrowCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Acceptance Result for exchange
    app.put("/borrow/accept/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requestResult: requester,
          accept: true,
        },
        $unset: {
          requesterDetails: null,
        },
      };
      const result = await borrowCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Rejection Result for Borrow
    app.put("/borrow/reject/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requestResult: requester,
          accept: false,
        },
        $unset: {
          requesterDetails: null,
        },
      };
      const result = await borrowCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });
    //Delete Book from Borrow
    app.delete("/borrow/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await borrowCollection.deleteOne(query);
      res.send(result);
    });

    //**********************
    //   Books - Store
    //**********************

    app.get("/books", async (req, res) => {
      const query = {};
      const cursor = bookCollection.find(query);
      const books = await cursor.toArray();
      res.send(books);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    //************************
    //User - Admin - Librarian
    //************************

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
      res.send({ result, token });
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "FORBIDDEN Access" });
      }
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Boi Exchange Server is Running");
});

app.listen(port, () => {
  console.log(`Boi Exchange Web listening on port ${port}`);
});
