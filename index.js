const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt=require('jsonwebtoken');
const cookieparser=require('cookie-parser');

const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors({
  origin: ['http://localhost:5173','https://job-portal-60970.web.app','https://job-portal-60970.firebaseapp.com'],
  credentials: true
}));
app.use(express.json());
app.use(cookieparser());

app.get("/", (req, res) => {
  res.send("Job is falling from the sky");
});





const logger=(req,res,next)=>{
  console.log('inside the logger');
  next();
}

const verifToken=(req,res,next)=>{
  const token=req.cookies.token;
  if(!token){
    return res.status(401).send({message: 'Unauthorized access'});
  }
  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message: 'Unauthorized access'})
    }
    req.user=decoded;
    next();
  })
}






//mongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n7txs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    // Send a ping to confirm a successful connection

    // jobs related api
    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection = client
      .db("jobPortal")
      .collection("job_applications");


    // Auth realted api
    app.post('/jwt',async(req,res)=>{
      const user=req.body;
      const token=jwt.sign(user,process.env.JWT_SECRET,{expiresIn: '1h'});
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
      }).send({success: true});
    })

    app.post('/logout',(req,res)=>{
      res.clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV==='production',
        sameSite: process.env.NODE_ENV==='production'?'none':'strict',
      }).send({success: true});
    })





      
    //job realted api
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    //job application api
    app.post("/job-application", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);

      // not the best way (use aggregate)
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollection.findOne(query);

      let count = 0;
      if (job.applicationCount) {
        count = job.applicationCount + 1;
      } else {
        count = 1;
      }

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          applicationCount: count,
        },
      };

      const updatedResult = await jobsCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });

    app.get("/job-application/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobApplicationCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/job-application",verifToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await jobApplicationCollection.find(query).toArray();

      if(req.user.email!==email)
      {
        return res.status(403);
      }

      // bad way
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.location = job.location;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    app.patch('/job-application/:id',async(req,res)=>{
      const id=req.params.id;
      const data=req.body;
      const filter={_id: new ObjectId(id)};
      const updatedDoc={
        $set:{
          status: data.status
        }
      }
      const result=await jobApplicationCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Job is waiting at ${port}`);
});
