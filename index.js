const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Job is falling from the sky");
});

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
    await client.connect();
    // Send a ping to confirm a successful connection

    // jobs related api
    const jobsCollection = client.db("jobPortal").collection("jobs");
    const jobApplicationCollection=client.db('jobPortal').collection('job_applications')

    app.get("/jobs", async (req, res) => {
      const email=req.query.email;
      let query={};
      if(email){
        query={hr_email: email};
      }
      const cursor=jobsCollection.find(query);
      const result=await cursor.toArray();
      res.send(result);
    });

    app.get('/jobs/:id',async(req,res)=>{
      const id=req.params;
      const query={_id: new ObjectId(id)};
      const result= await jobsCollection.findOne(query);
      res.send(result);
    })




    //job application api
    app.post('/job-application',async(req,res)=>{
      const application=req.body;
      const result=await jobApplicationCollection.insertOne(application);

      // not the best way (use aggregate)
      const id=application.job_id;
      const query={_id: new ObjectId(id)};
      const job=await jobsCollection.findOne(query);

      let count=0;
      if(job.applicationCount){
        count=job.applicationCount+1;
      }
      else{
        count=1;
      }

      const filter={_id: new ObjectId(id)};
      const updatedDoc={
        $set:{
          applicationCount: count
        }
      }

      const updatedResult=await jobsCollection.updatedOne(filter,updatedDoc);

      res.send(result);
    })

    app.get('/job-application',async(req,res)=>{
      const email=req.query.email;
      const query={applicant_email: email}
      const result=await jobApplicationCollection.find(query).toArray();

      // bad way
      for(const application of result){
        const query1={_id: new ObjectId(application.job_id)};
        const job=await jobsCollection.findOne(query1);
        if(job){
          application.title=job.title;
          application.company=job.company;
          application.location=job.location;
          application.company_logo=job.company_logo;
        }
      }

      app.post('/jobs',async(req,res)=>{
        const newJob=req.body;
        const result=await jobsCollection.insertOne(newJob);
        res.send(result);
      })



      res.send(result);
    })








    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
} 
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Job is waiting at ${port}`);
});
