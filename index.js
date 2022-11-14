const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { query, response } = require("express");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
// verify User with token
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
    const orderCollection = client.db("boi_exchange").collection("orders");
    const userCollection = client.db("boi_exchange").collection("users");
    const exchangeCollection = client.db("boi_exchange").collection("exchange");
    const borrowCollection = client.db("boi_exchange").collection("borrow");

    //Payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

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
          requesterEmail: requester.requesterEmail,
          message: requester.message,
          date: requester.date,
          time: requester.time,
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
          requesterEmail: requester.requesterEmail,
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
    // Get Acceptance Result for exchange (Requester)
    app.get("/exchange/result/:mail", async (req, res) => {
      const email = req.params.mail;
      const query = { requesterEmail: email };
      const cursor = exchangeCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    //Rejection Result for exchange
    app.put("/exchange/cancel/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $unset: {
          accept: null,
          date: null,
          message: null,
          requesterEmail: null,
          time: null,
        },
      };
      const result = await exchangeCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //**********************
    //       Borrow
    //**********************

    //All available books for Borrow
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
    //Acceptance Result for borrow
    app.put("/borrow/accept/:id", async (req, res) => {
      const id = req.params.id;
      const requester = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          requesterEmail: requester.requesterEmail,
          message: requester.message,
          date: requester.date,
          time: requester.time,
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
          requesterEmail: requester.requesterEmail,
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
    // Get Acceptance Result for borrow (Requester)
    app.get("/borrow/result/:mail", async (req, res) => {
      const email = req.params.mail;
      const query = { requesterEmail: email };
      const cursor = borrowCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    //Rejection Result for borrow
    app.put("/borrow/cancel/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $unset: {
          accept: null,
          date: null,
          message: null,
          requesterEmail: null,
          time: null,
        },
      };
      const result = await borrowCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //**********************
    //   Books - Store
    //**********************
    // Get All books
    app.get("/books", async (req, res) => {
      const query = {};
      const cursor = bookCollection.find(query);
      const books = await cursor.toArray();
      res.send(books);
    });
    // Get specific book
    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });
    //Get Search Result
    app.get("/book", async (req, res) => {
      const filters = req.query;
      const books = await bookCollection.find({}).toArray();
      let filteredBooks = [];
      books.filter((book) => {
        const lowerCaseName = book.name.toLowerCase();
        for (key in filters) {
          const filterName = filters[key].toLowerCase();
          if (lowerCaseName.includes(filterName)) {
            filteredBooks.push(book);
          }
        }
      });
      res.send(filteredBooks);
    });
    // Delete specific book
    app.delete("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookCollection.deleteOne(query);
      res.send(result);
    });
    //Add Book to Store
    app.post("/book", async (req, res) => {
      const book = req.body;
      const query = {
        name: book.name,
        category: book.category,
        writter: book.writter,
        image: book.image,
        price: book.price,
      };
      const result = await bookCollection.insertOne(query);
      res.send(result);
    });

    //**********************
    //      Orders
    //**********************
    // Get All Orders
    app.get("/order", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    //Post Order by Submitting form
    app.post("/order", verifyJWT, async (req, res) => {
      const order = req.body;
      const query = {
        name: order.name,
        email: order.email,
        phone: order.phone,
        address: order.address,
        bookID: order.bookID,
        bookName: order.bookName,
        price: order.price,
      };
      const result = await orderCollection.insertOne(query);
      res.send(result);
    });
    //My Ordered Books
    app.get("/order/:mail", async (req, res) => {
      const email = req.params.mail;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Get specific order for payment
    app.get("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    app.patch("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      // const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await bookingCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });

    //************************
    //User - Admin - Librarian
    //************************

    // Get All User Information
    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });
    //Update User Profile
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
    // Get Specific User Information
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });
    // Add Admin
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
    // Add Librarian
    app.put("/user/librarian/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "librarian" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "FORBIDDEN Access" });
      }
    });
    // Remove Admin
    app.put("/user/removeAdmin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $unset: { role: "" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "FORBIDDEN Access" });
      }
    });
    // Remove Librarian
    app.put("/user/removeLibrarian/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $unset: { role: "" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "FORBIDDEN Access" });
      }
    });
    //Check Admin Role for UseAdmin Hook
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });
    //Check Librarian Role for UseLibrarian Hook
    app.get("/librarian/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isLibrarian = user?.role === "librarian";
      res.send({ librarian: isLibrarian });
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
