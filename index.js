const express = require("express");
const app = express();
const cors = require("cors");
const PORT = process.env.PORT || 3000;
require("dotenv").config();

// for striep starts ───────────────────────────────────────────────────────
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Stripe = require("stripe");

if (!process.env.PAYMENT_GATEWAY_KEY) {
  console.warn(
    "⚠️  STRIPE_SECRET_KEY missing – Stripe routes will be disabled."
  );
}
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;
// for stripe ends ───────────────────────────────────────────────────────
// CORS Configuration - This is crucial for your deployment
const corsOptions = {
  origin: [
    "http://localhost:5173", 
    "https://assignment-12-cf373.web.app", 
    "https://assignment-12-cf373.firebaseapp.com"
    
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
// CORS Configuration - This is crucial for your deployment

app.get("/", (req, res) => {
  res.send("Coffee server is ready to be used!");
});

app.listen(PORT, () => {
  console.log(`Coffee server is currently running on port number: ${PORT}`);
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@first-try-mongodb-atlas.3vtotij.mongodb.net/?retryWrites=true&w=majority&appName=First-Try-Mongodb-Atlas-Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// copied from firebase console -> running project -> project settings -> service accounts -> firebase admin sdk
const admin = require("firebase-admin");

// decoding the stuffs that you encoded in keyConvert.js file
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// writing middleware for verifying the token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;
  // console.log(authorization);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Sorry man, you are trying to do an unauthorized access!",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("decodeed token", decoded);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({
      message: "Sorry man, you are trying to do an unauthorized access!",
    });
  }
};

// writing middleware to reduce duplications of code
const verifyTokenEmail = (req, res, next) => {
  const requestEmail = req.query.email || req.body.email;
  if (requestEmail !== req.decoded.email) {
    return res.status(403).send({
      message: "forbidden acess. sorry from verifyTokenEmail function.",
    });
  }
  next();
};

// এসাইনমেন্ট-12 এর গ্রুপ গুলোর জন্য ব্র্যান্ড নিউ ডাটাবেস ও কালেকশন
const postDatabase = client.db("postAssignment12DB");
const postCollection = postDatabase.collection("postAssignment12COL");
const upvotedPostCollection = postDatabase.collection(
  "upvotedPostsAssignment12COL"
);
const commentCollection = postDatabase.collection("commentsAssignment12COL");
const usersCollection = postDatabase.collection("usersAssignment12COL");
const announcementCollection = postDatabase.collection(
  "announcementsAssignment12COL"
);
const tagsCollection = postDatabase.collection("tagsAssignment12");
async function run() {
  try {
    // 1.  new API to get all the post data
    // GET /allPostsData?tag=react&sort=popular
    // app.get("/allPostsData", async (req, res) => {
    //   try {
    //     const { tag, sort } = req.query;

    //     /** 1️⃣  build match stage */
    //     const matchStage = tag ? { tags: tag } : {};

    //     /** 2️⃣  build sort stage */
    //     let sortStage = { postTime: -1 }; // newest first (default)
    //     let addFieldsStage = {};

    //     if (sort === "popular") {
    //       addFieldsStage = {
    //         $addFields: {
    //           voteDifference: { $subtract: ["$upVote", "$downVote"] },
    //         },
    //       };
    //       sortStage = { voteDifference: -1 };
    //     }

    //     /** 3️⃣  aggregation */
    //     const pipeline = [
    //       { $match: matchStage },
    //       ...(sort === "popular" ? [addFieldsStage] : []),
    //       { $sort: sortStage },
    //     ];

    //     const allPosts = await postCollection.aggregate(pipeline).toArray();
    //     res.send(allPosts);
    //   } catch (error) {
    //     console.error("Error fetching all posts data:", error);
    //     res.status(500).send({ error: "Failed to fetch all posts data" });
    //   }
    // });
    // 1  for getting all the posts and do pagination
    // Updated API endpoint with pagination
    // GET /allPostsData?tag=react&sort=popular&page=1&limit=5
    app.get("/allPostsData", async (req, res) => {
      try {
        const { tag, sort, page = 1, limit = 5 } = req.query;

        // Convert to numbers and validate
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, Math.min(50, parseInt(limit))); // Max 50 per page
        const skip = (pageNum - 1) * limitNum;

        /** 1️⃣ Build match stage */
        const matchStage = tag ? { tags: tag } : {};

        /** 2️⃣ Build sort stage */
        let sortStage = { postTime: -1 }; // newest first (default)
        let addFieldsStage = {};

        if (sort === "popular") {
          addFieldsStage = {
            $addFields: {
              voteDifference: { $subtract: ["$upVote", "$downVote"] },
            },
          };
          sortStage = { voteDifference: -1 };
        }

        /** 3️⃣ Aggregation pipeline with pagination */
        const pipeline = [
          { $match: matchStage },
          ...(sort === "popular" ? [addFieldsStage] : []),
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limitNum },
        ];

        /** 4️⃣ Get total count for pagination info */
        const totalPipeline = [{ $match: matchStage }, { $count: "total" }];

        const [allPosts, totalResult] = await Promise.all([
          postCollection.aggregate(pipeline).toArray(),
          postCollection.aggregate(totalPipeline).toArray(),
        ]);

        const total = totalResult.length > 0 ? totalResult[0].total : 0;
        const totalPages = Math.ceil(total / limitNum);

        res.send({
          posts: allPosts,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalPosts: total,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
            limit: limitNum,
          },
        });
      } catch (error) {
        console.error("Error fetching all posts data:", error);
        res.status(500).send({ error: "Failed to fetch all posts data" });
      }
    });
    //COUNNTING for admin dashboard - 1 :  counting all the posts
    app.get("/posts/count/simple", async (req, res) => {
      try {
        const totalCount = await postCollection.countDocuments();
        res.send({ totalPosts: totalCount });
      } catch (error) {
        console.error("Error counting posts:", error);
        res.status(500).send({ error: "Failed to count posts" });
      }
    });

    // COUNNTING for admin dashboard - 2 :  counting all the comments
    app.get("/comments/count/simple", async (req, res) => {
      try {
        const totalComments = await commentCollection.countDocuments();
        res.json({ totalComments });
      } catch (error) {
        console.error("Error counting comments:", error);
        res.status(500).json({ error: "Failed to count comments" });
      }
    });

    // COUNNTING for admin dashboard - 3 :  counting all the users
    app.get("/users/count/simple", async (req, res) => {
      try {
        const totalUsers = await usersCollection.countDocuments();
        res.json({ totalUsers });
      } catch (error) {
        console.error("Error counting users:", error);
        res.status(500).json({ error: "Failed to count users" });
      }
    });

    // 2. PATCH /posts/:id/vote/up  -> increments upVote by 1
    app.patch("/posts/:id/vote/up", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await postCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { upVote: 1 } }
        );
        res.send(result);
      } catch (err) {
        console.error("Up‑vote error:", err);
        res.status(500).send({ error: "Up‑vote failed" });
      }
    });

    // 3. PATCH /posts/:id/vote/down -> increments downVote by 1
    app.patch("/posts/:id/vote/down", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await postCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { downVote: 1 } }
        );
        res.send(result);
      } catch (err) {
        console.error("Down‑vote error:", err);
        res.status(500).send({ error: "Down‑vote failed" });
      }
    });

    /* 4..1. Create a comment  (POST /comments)
   body: { postId, postTitle, commenterEmail, commentText, time }
*/

    // 4.1. Update the comment creation to include reports array
    app.post("/comments", async (req, res) => {
      try {
        const { postId, postTitle, commenterEmail, commentText } = req.body;
        if (!postId || !commentText)
          return res.status(400).send({ message: "Missing fields" });

        const doc = {
          postId: new ObjectId(postId),
          postTitle,
          commenterEmail,
          commentText,
          time: new Date(),
          reports: [], // Add this line
        };
        const result = await commentCollection.insertOne(doc);

        // Update comment count
        await postCollection.updateOne(
          { _id: new ObjectId(postId) },
          { $inc: { commentCount: 1 } }
        );

        res.send(result);
      } catch (err) {
        console.error("Create comment error:", err);
        res.status(500).send({ error: "Create comment failed" });
      }
    });

    // 4.2. Add route to report a comment
    app.post("/comments/:commentId/report", async (req, res) => {
      try {
        const { commentId } = req.params;
        const { reporterEmail, feedback } = req.body;

        if (!reporterEmail || !feedback) {
          return res
            .status(400)
            .send({ message: "Reporter email and feedback are required" });
        }

        const report = {
          reporterEmail,
          feedback,
          reportedAt: new Date(),
        };

        const result = await commentCollection.updateOne(
          { _id: new ObjectId(commentId) },
          { $push: { reports: report } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: "Comment not found" });
        }

        res.send({ success: true, message: "Comment reported successfully" });
      } catch (err) {
        console.error("Report comment error:", err);
        res.status(500).send({ error: "Report comment failed" });
      }
    });

    // 4.3. Get comments with pagination (optional enhancement)
    app.get("/comments/:postId", async (req, res) => {
      try {
        const postId = req.params.postId;
        const comments = await commentCollection
          .find({ postId: new ObjectId(postId) })
          .sort({ time: -1 })
          .toArray();
        res.send(comments);
      } catch (err) {
        console.error("Fetch comments error:", err);
        res.status(500).send({ error: "Fetch comments failed" });
      }
    });

    /* 4.4. (Optional) DELETE a comment (for admin/report logic) */
    app.delete("/comments/:commentId", async (req, res) => {
      try {
        const commentId = req.params.commentId;
        const result = await commentCollection.deleteOne({
          _id: new ObjectId(commentId),
        });
        res.send(result);
      } catch (err) {
        console.error("Delete comment error:", err);
        res.status(500).send({ error: "Delete comment failed" });
      }
    });

    //4.5  endpoint to get all comments for admin dashboard
    app.get("/comments", async (req, res) => {
      try {
        const comments = await commentCollection
          .find({})
          .sort({ time: -1 })
          .toArray();
        res.send(comments);
      } catch (err) {
        console.error("Fetch all comments error:", err);
        res.status(500).send({ error: "Fetch all comments failed" });
      }
    });
    // 5. GET /posts/:id   (for PostDetails)
    app.get("/posts/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const post = await postCollection.findOne({ _id: new ObjectId(id) });
        if (!post) return res.status(404).send({ error: "Not found" });
        res.send(post);
      } catch (e) {
        res.status(500).send({ error: "Fetch single post failed" });
      }
    });
    // 5.2 DELETE a post by ID
    // app.delete("/posts/:id", async (req, res) => {
    //   try {
    //     const postId = req.params.id;
    //     const emailFromToken = req.decoded.email;

    //     // Validate ObjectId format
    //     if (!ObjectId.isValid(postId)) {
    //       return res.status(400).send({ message: "Invalid post ID format" });
    //     }

    //     // Find the post first
    //     const post = await postCollection.findOne({
    //       _id: new ObjectId(postId),
    //     });

    //     if (!post) {
    //       return res.status(404).send({ message: "Post not found" });
    //     }

    //     // Check if the user is the author of the post
    //     if (post.authorEmail !== emailFromToken) {
    //       return res.status(403).send({
    //         message: "Unauthorized: You can only delete your own posts",
    //       });
    //     }

    //     // Delete the post
    //     const result = await postCollection.deleteOne({
    //       _id: new ObjectId(postId),
    //     });

    //     // Also delete associated comments (optional but recommended)
    //     await commentCollection.deleteMany({ postId: new ObjectId(postId) });

    //     res.send({
    //       success: true,
    //       message: "Post deleted successfully",
    //       deletedCount: result.deletedCount,
    //     });
    //   } catch (err) {
    //     console.error("Delete post error:", err);
    //     res
    //       .status(500)
    //       .send({ error: "Delete post failed", details: err.message });
    //   }
    // });
    // 5.2 DELETE a post by ID - COMPLETE FIXED VERSION
app.delete("/posts/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const emailFromToken = req.decoded.email;

    console.log('Delete request for post:', postId, 'by user:', emailFromToken);

    // Validate ObjectId format
    if (!ObjectId.isValid(postId)) {
      console.log('Invalid ObjectId format:', postId);
      return res.status(400).send({ message: "Invalid post ID format" });
    }

    // Find the post first
    const post = await postCollection.findOne({
      _id: new ObjectId(postId),
    });

    console.log('Found post:', post ? 'yes' : 'no', post ? `by ${post.authorEmail}` : '');

    if (!post) {
      return res.status(404).send({ message: "Post not found" });
    }

    // Check if the user is the author of the post
    if (post.authorEmail !== emailFromToken) {
      console.log('Authorization failed:', post.authorEmail, '!=', emailFromToken);
      return res.status(403).send({
        message: "Unauthorized: You can only delete your own posts",
      });
    }

    console.log('Authorization successful, proceeding with deletion');

    // Delete the post
    const result = await postCollection.deleteOne({
      _id: new ObjectId(postId),
    });

    console.log('Delete result:', result);

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Post not found or already deleted" });
    }

    // Also delete associated comments (optional but recommended)
    const commentDeletionResult = await commentCollection.deleteMany({ 
      postId: new ObjectId(postId) 
    });

    console.log('Associated comments deleted:', commentDeletionResult.deletedCount);

    res.status(200).send({
      success: true,
      message: "Post deleted successfully",
      deletedCount: result.deletedCount,
      commentsDeleted: commentDeletionResult.deletedCount,
    });

  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).send({ 
      success: false,
      error: "Delete post failed", 
      details: err.message 
    });
  }
});

    // 6. 1 POST /posts  — create a new post
    // POST /posts  – create, with 5‑post cap for non‑members

    app.post("/posts", async (req, res) => {
      try {
        const {
          authorImage,
          authorName,
          authorEmail,
          role = "user",
          postTitle,
          postDescription,
          tags = [],
          upVote = 0, // ← pull in from client
          downVote = 0, // ← pull in from client
        } = req.body;

        /* ─── validation */
        if (!authorEmail)
          return res.status(400).json({ message: "authorEmail required" });
        if (!postTitle?.trim() || !postDescription?.trim())
          return res
            .status(400)
            .json({ message: "postTitle and postDescription required" });
        if (tags.length > 5)
          return res.status(400).json({ message: "max 5 tags" });

        /* ─── posting‑limit enforcement (unchanged) */
        const normalizedRole = role.toLowerCase();
        const isMember =
          normalizedRole === "member" || normalizedRole === "admin";

        if (!isMember) {
          const current = await postCollection.countDocuments({ authorEmail });
          if (current >= MAX_FREE_POSTS) {
            return res.status(403).json({
              message: `Free users can post only ${MAX_FREE_POSTS} times`,
              current,
              limit: MAX_FREE_POSTS,
            });
          }
        }

        /* ─── insert */
        const doc = {
          authorImage: authorImage || "https://i.pravatar.cc/150",
          authorName: authorName || "Anonymous",
          authorEmail,
          role: normalizedRole,
          postTitle: postTitle.trim(),
          postDescription: postDescription.trim(),
          tags,
          postTime: new Date(),
          upVote: Number(upVote), // ← use the client‑provided values
          downVote: Number(downVote), // ← (cast to number just in case)
          commentCount: 0,
          reports: [],
        };

        const { insertedId } = await postCollection.insertOne(doc);
        res.status(201).json({ success: true, insertedId });
      } catch (err) {
        console.error("create‑post error:", err);
        res
          .status(500)
          .json({ success: false, message: "Server error creating post" });
      }
    });

    //6.2  GET /posts/count?email=user@example.com
    // Warning: this api doesnt workkkkkkkkkkkk
    app.get("/posts/count", async (req, res) => {
      try {
        const email = req.query.email?.trim(); // email from query‑string
        if (!email) {
          return res
            .status(400)
            .json({ message: "email query‑param required" });
        }

        const count = await postCollection.countDocuments({
          authorEmail: email,
        });

        res.json({ count }); // nothing more, nothing less
      } catch (err) {
        console.error("posts/count →", err);
        res.status(500).json({ message: "server error" });
      }
    });
    // Add this to your backend code (after the existing routes)

    // 7. GET /posts/user/:email - Get all posts by a specific user
    app.get("/posts/user/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;

        if (!userEmail) {
          return res.status(400).send({
            message: "Email parameter is required",
          });
        }

        const userPosts = await postCollection
          .find({ authorEmail: userEmail })
          .sort({ postTime: -1 }) // newest first
          .toArray();

        res.send(userPosts);
      } catch (error) {
        console.error("Fetch user posts error:", error);
        res.status(500).send({ error: "Failed to fetch user posts" });
      }
    });

    // for stripe starts .....................................
    app.post("/create-payment-intent", async (req, res) => {
      try {
        if (!stripe) {
          return res.status(500).json({
            error: "Stripe not configured properly",
          });
        }

        const {
          amount,
          currency = "usd",
          description = "Premium Membership",
        } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
          return res.status(400).json({
            error: "Invalid amount provided",
          });
        }

        // For membership, ensure it's exactly $20
        const MEMBERSHIP_PRICE = 20;
        if (amount !== MEMBERSHIP_PRICE) {
          return res.status(400).json({
            error: `Invalid amount. Membership costs $${MEMBERSHIP_PRICE}`,
          });
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100, // Convert to cents
          currency,
          description,
          metadata: {
            type: "membership_upgrade",
            amount: amount.toString(),
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: amount,
          currency: currency,
        });
      } catch (error) {
        console.error("Stripe payment intent creation error:", error);
        res.status(500).json({
          error: error.message || "Failed to create payment intent",
        });
      }
    });
    // for stripe ends  .....................................!

    // for user management starts .....................................
    // User management endpoints
    // Updated user management endpoints with better error handling

    // 1)  POST /users  ─ create user (no verification)
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;

        // If the user already exists, tell the client
        const existingUser = await usersCollection.findOne({
          uid: userData.uid,
        });
        if (existingUser) {
          return res.status(409).json({
            error: "User already exists",
            message: "User already exists",
            user: existingUser,
          });
        }

        // Convert date‑strings → Date objects (optional safety)
        if (userData.createdAt)
          userData.createdAt = new Date(userData.createdAt);
        if (userData.lastLoginAt)
          userData.lastLoginAt = new Date(userData.lastLoginAt);

        // Add server timestamps
        userData.createdAt = userData.createdAt || new Date();
        userData.updatedAt = new Date();

        // Insert into MongoDB
        const result = await usersCollection.insertOne(userData);

        console.log("User saved:", userData.email);
        res.status(201).json({
          message: "User created successfully",
          user: userData,
          insertedId: result.insertedId,
        });
      } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 2)  PATCH /users/:uid  ─ update user (no verification)
    app.patch("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        const updateData = req.body;

        if (updateData.lastLoginAt) {
          updateData.lastLoginAt = new Date(updateData.lastLoginAt);
        }
        updateData.updatedAt = new Date();

        const result = await usersCollection.updateOne(
          { uid },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await usersCollection.findOne({ uid });
        console.log("User updated:", updatedUser.email);
        res.json({
          message: "User updated successfully",
          user: updatedUser,
          modifiedCount: result.modifiedCount,
        });
      } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 3)  GET /users/:uid  ─ fetch user (no verification)
    app.get("/users/:uid", async (req, res) => {
      try {
        const { uid } = req.params;

        const user = await usersCollection.findOne({ uid });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
      } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // for user managements ends .....................................!

    // claude for stripe starts .....................................
    // 4)  PATCH /users/:uid/upgrade-to-member  ─ upgrade user to member after payment
    // ──────────────────────────────────────────────────────────────
    app.patch("/users/:uid/upgrade-to-member", async (req, res) => {
      try {
        const { uid } = req.params;
        const { paymentIntentId, amount, currency } = req.body;

        // Validate required fields
        if (!paymentIntentId || !amount || !currency) {
          return res.status(400).json({
            error: "Missing required fields: paymentIntentId, amount, currency",
          });
        }

        // Check if user exists
        const existingUser = await usersCollection.findOne({ uid });
        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if user is already a member
        if (existingUser.role === "member") {
          return res.status(400).json({
            error: "User is already a member",
            user: existingUser,
          });
        }

        // Optional: Verify payment with Stripe (recommended for production)
        if (stripe) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId
            );

            if (paymentIntent.status !== "succeeded") {
              return res.status(400).json({
                error: "Payment not successful",
                paymentStatus: paymentIntent.status,
              });
            }

            // Verify amount matches
            if (paymentIntent.amount !== amount * 100) {
              // Stripe uses cents
              return res.status(400).json({
                error: "Payment amount mismatch",
              });
            }
          } catch (stripeError) {
            console.error("Stripe verification error:", stripeError);
            return res.status(400).json({
              error: "Failed to verify payment with Stripe",
            });
          }
        }

        // Update user role to member
        const updateData = {
          role: "member",
          membershipStartDate: new Date(),
          paymentHistory: {
            paymentIntentId,
            amount,
            currency,
            paidAt: new Date(),
            type: "membership_upgrade",
          },
          updatedAt: new Date(),
        };

        // If user already has payment history, append to it
        if (existingUser.paymentHistory) {
          updateData.$push = {
            paymentHistory: updateData.paymentHistory,
          };
          delete updateData.paymentHistory;
        } else {
          updateData.paymentHistory = [updateData.paymentHistory];
        }

        const result = await usersCollection.updateOne(
          { uid },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ error: "User not found during update" });
        }

        // Fetch updated user data
        const updatedUser = await usersCollection.findOne({ uid });

        console.log(
          `User ${updatedUser.email} upgraded to member successfully`
        );

        res.json({
          message: "User successfully upgraded to member",
          user: updatedUser,
          paymentDetails: {
            paymentIntentId,
            amount,
            currency,
            paidAt: new Date(),
          },
        });
      } catch (err) {
        console.error("Error upgrading user to member:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // ──────────────────────────────────────────────────────────────
    // 5)  GET /users/:uid/membership-status  ─ check user membership status
    // ──────────────────────────────────────────────────────────────
    app.get("/users/:uid/membership-status", async (req, res) => {
      try {
        const { uid } = req.params;

        const user = await usersCollection.findOne({ uid });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const membershipStatus = {
          uid: user.uid,
          email: user.email,
          role: user.role,
          isMember: user.role === "member",
          membershipStartDate: user.membershipStartDate || null,
          paymentHistory: user.paymentHistory || [],
        };

        res.json(membershipStatus);
      } catch (err) {
        console.error("Error checking membership status:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // claude for stripe ends .....................................!

    // for admin starts.........................
    // GET /users?search=someName
    // app.get("/users", async (req, res) => {
    //   try {
    //     const { search } = req.query;
    //     let query = {};
    //     if (search) {
    //       // Case-insensitive search by displayName or name
    //       query = {
    //         $or: [
    //           { displayName: { $regex: search, $options: "i" } },
    //           { name: { $regex: search, $options: "i" } },
    //         ],
    //       };
    //     }
    //     const users = await usersCollection.find(query).toArray();
    //     res.json(users);
    //   } catch (err) {
    //     console.error("Error fetching users:", err);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // });
    // GET /users with pagination + search
    app.get("/users", async (req, res) => {
      try {
        const { search = "", page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const lim = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * lim;

        // Build search filter
        const filter = search
          ? {
              $or: [
                { displayName: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
              ],
            }
          : {};

        // Fetch paged users and total count
        const [users, countResult] = await Promise.all([
          usersCollection.find(filter).skip(skip).limit(lim).toArray(),
          usersCollection.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(countResult / lim);
        res.json({ users, totalPages });
      } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // PATCH /users/:uid/make-admin
    app.patch("/users/:uid/make-admin", async (req, res) => {
      try {
        const { uid } = req.params;
        const result = await usersCollection.updateOne(
          { uid },
          { $set: { role: "admin", updatedAt: new Date() } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "User not found" });
        }
        const updatedUser = await usersCollection.findOne({ uid });
        res.json({
          message: "User promoted to admin",
          user: updatedUser,
        });
      } catch (err) {
        console.error("Error promoting user to admin:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // for admin ends.........................

    // for admin starts 2.........................
    // GET /reported-comments
    // app.get("/reported-comments", async (req, res) => {
    //   try {
    //     // Find comments with at least one report
    //     const reportedComments = await commentCollection
    //       .find({ "reports.0": { $exists: true } })
    //       .sort({ "reports.reportedAt": -1 })
    //       .toArray();
    //     res.json(reportedComments);
    //   } catch (err) {
    //     console.error("Error fetching reported comments:", err);
    //     res.status(500).json({ error: "Internal server error" });
    //   }
    // });
    app.get("/reported-comments", async (req, res) => {
      try {
        const { page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const lim = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (pageNum - 1) * lim;

        // Only comments with at least one report
        const filter = {
          reports: { $exists: true, $ne: [], $not: { $size: 0 } },
        };

        const [comments, count] = await Promise.all([
          commentCollection
            .find(filter)
            .sort({ time: -1 })
            .skip(skip)
            .limit(lim)
            .toArray(),
          commentCollection.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(count / lim);
        res.json({ comments, totalPages });
      } catch (err) {
        console.error("Error fetching reported-comments:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // PATCH /comments/:commentId/dismiss-reports
    app.patch("/comments/:commentId/dismiss-reports", async (req, res) => {
      try {
        const { commentId } = req.params;
        const result = await commentCollection.updateOne(
          { _id: new ObjectId(commentId) },
          { $set: { reports: [] } }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Comment not found" });
        }
        res.json({ message: "Reports dismissed" });
      } catch (err) {
        console.error("Error dismissing reports:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // for admin ends 2.........................
    // for admin starts 3.........................

    // Announcement endpoints
    // 1. POST /announcements - Create a new announcement (Admin only)
    app.post("/announcements", async (req, res) => {
      try {
        const {
          authorImage,
          authorName,
          title,
          description,
          authorEmail,
          priority = "normal", // normal, high, urgent
        } = req.body;

        // Validation
        if (!authorName || !title || !description || !authorEmail) {
          return res.status(400).json({
            error:
              "Missing required fields: authorName, title, description, authorEmail",
          });
        }

        // Check if user is admin (you might want to add middleware for this)
        const user = await usersCollection.findOne({ email: authorEmail });
        if (!user || user.role !== "admin") {
          return res.status(403).json({
            error: "Only admins can create announcements",
          });
        }

        const announcement = {
          authorImage: authorImage || "https://i.pravatar.cc/150",
          authorName: authorName.trim(),
          authorEmail,
          title: title.trim(),
          description: description.trim(),
          priority,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };

        const result = await announcementCollection.insertOne(announcement);

        res.status(201).json({
          success: true,
          message: "Announcement created successfully",
          insertedId: result.insertedId,
          announcement,
        });
      } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 2. GET /announcements - Get all active announcements
    app.get("/announcements", async (req, res) => {
      try {
        const { limit = 10, priority } = req.query;

        let query = { isActive: true };
        if (priority) {
          query.priority = priority;
        }

        const announcements = await announcementCollection
          .find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .toArray();

        res.json({
          success: true,
          count: announcements.length,
          announcements,
        });
      } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 3. GET /announcements/:id - Get specific announcement
    app.get("/announcements/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const announcement = await announcementCollection.findOne({
          _id: new ObjectId(id),
          isActive: true,
        });

        if (!announcement) {
          return res.status(404).json({ error: "Announcement not found" });
        }

        res.json({
          success: true,
          announcement,
        });
      } catch (error) {
        console.error("Error fetching announcement:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 4. PATCH /announcements/:id - Update announcement (Admin only)
    app.patch("/announcements/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { title, description, priority, authorEmail } = req.body;

        // Check if user is admin
        const user = await usersCollection.findOne({ email: authorEmail });
        if (!user || user.role !== "admin") {
          return res.status(403).json({
            error: "Only admins can update announcements",
          });
        }

        const updateData = {
          updatedAt: new Date(),
        };

        if (title) updateData.title = title.trim();
        if (description) updateData.description = description.trim();
        if (priority) updateData.priority = priority;

        const result = await announcementCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Announcement not found" });
        }

        const updatedAnnouncement = await announcementCollection.findOne({
          _id: new ObjectId(id),
        });

        res.json({
          success: true,
          message: "Announcement updated successfully",
          announcement: updatedAnnouncement,
        });
      } catch (error) {
        console.error("Error updating announcement:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 5. DELETE /announcements/:id - Delete/deactivate announcement (Admin only)
    app.delete("/announcements/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { authorEmail } = req.body;

        // Check if user is admin
        const user = await usersCollection.findOne({ email: authorEmail });
        if (!user || user.role !== "admin") {
          return res.status(403).json({
            error: "Only admins can delete announcements",
          });
        }

        // Instead of deleting, we'll deactivate
        const result = await announcementCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isActive: false,
              deletedAt: new Date(),
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Announcement not found" });
        }

        res.json({
          success: true,
          message: "Announcement deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // 6. GET /announcements/admin/all - Get all announcements including inactive (Admin only)
    app.get("/announcements/admin/all", async (req, res) => {
      try {
        const { authorEmail } = req.query;

        // Check if user is admin
        const user = await usersCollection.findOne({ email: authorEmail });
        if (!user || user.role !== "admin") {
          return res.status(403).json({
            error: "Only admins can view all announcements",
          });
        }

        const announcements = await announcementCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.json({
          success: true,
          count: announcements.length,
          announcements,
        });
      } catch (error) {
        console.error("Error fetching all announcements:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    // for admin ends 3.........................

    // for admin - 4 (adding and managing tasks) starts.........................
    // POST /tags - Add a new tag to the tags collection
    app.post("/tags", async (req, res) => {
      try {
        const { tag } = req.body;

        // Validate tag input
        if (!tag || typeof tag !== "string" || !tag.trim()) {
          return res.status(400).json({
            success: false,
            message: "Tag is required and must be a non-empty string",
          });
        }

        const trimmedTag = tag.trim();

        // Check if tag already exists (case-insensitive)
        const existingTag = await tagsCollection.findOne({
          tag: { $regex: new RegExp(`^${trimmedTag}$`, "i") },
        });

        if (existingTag) {
          return res.status(409).json({
            success: false,
            message: "Tag already exists",
          });
        }

        // Create new tag document
        const newTag = {
          tag: trimmedTag,
          createdAt: new Date(),
          // You can add more fields like createdBy if needed
          // createdBy: req.user?.email || 'system'
        };

        // Insert the new tag
        const result = await tagsCollection.insertOne(newTag);

        if (result.insertedId) {
          res.status(201).json({
            success: true,
            message: "Tag added successfully",
            data: {
              _id: result.insertedId,
              ...newTag,
            },
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Failed to add tag",
          });
        }
      } catch (error) {
        console.error("Error adding tag:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    //  GET /tags - Get all tags
    app.get("/tags", async (req, res) => {
      try {
        const tags = await tagsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        res.status(200).json({
          success: true,
          data: tags,
        });
      } catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });

    // Optional: DELETE /tags/:id - Delete a tag (admin only)
    app.delete("/tags/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid tag ID",
          });
        }

        const result = await tagsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 1) {
          res.status(200).json({
            success: true,
            message: "Tag deleted successfully",
          });
        } else {
          res.status(404).json({
            success: false,
            message: "Tag not found",
          });
        }
      } catch (error) {
        console.error("Error deleting tag:", error);
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    });
    // for admin - 4 (adding and managing tasks) ends.........................

   

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // adding a new event info in the database that has been created by the user
    app.post(
      "/events/post",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const newEvent = req.body;
        const result = await postCollection.insertOne(newEvent);
        res.send(result);
      }
    );

    // get method to get all the events data
    app.get("/events/get", async (req, res) => {
      try {
        const { type, search } = req.query;
        let query = {};
        // 1 Sort by eventType
        if (type) {
          query.eventType = type;
        }
        // 2 Add filter to show only future events
        const currentDate = new Date();
        query.startDate = { $gte: currentDate.toISOString() };
        // 3 Search by eventTitle
        if (search) {
          query.eventTitle = { $regex: search, $options: "i" };
        }

        const cursor = postCollection.find(query).sort({ startDate: 1 });
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).send({ error: "Failed to fetch events" });
      }
    });

    // get method to get the events created by one specific user
    app.get(
      `/events`,
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const myEmail = req.query.email;
        const query = { email: myEmail };
        const cursor = postCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      }
    );

    // get method to get a single event's data through id
    app.get("/events/get/:eventID", async (req, res) => {
      const eventID = req.params.eventID;
      const query = { _id: new ObjectId(eventID) };
      const result = await postCollection.findOne(query);
      res.send(result);
    });

    // finding a "myEvent" with id and deleting it from the collection
    app.delete(
      "/myEvent/delete/:myEventID",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const myEventID = req.params.myEventID;
        const query = { _id: new ObjectId(myEventID) };
        const result = await postCollection.deleteOne(query);
        res.send(result);
      }
    );

    // Get featured events
    app.get("/events/featured", async (req, res) => {
      const query = { isFeatured: "true" };
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    // Finding a specific "myEvent" and Updating that specific "myEvent" data
    app.put(
      "/myEvent/put/:myEventID",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const myEventID = req.params.myEventID;
        const query = { _id: new ObjectId(myEventID) };
        const options = { upsert: true };
        const updateMyEventInfo = req.body;
        const updatedDOC = {
          $set: updateMyEventInfo,
        };

        const result = await postCollection.updateOne(
          query,
          updatedDOC,
          options
        );
        res.send(result);
      }
    );

    // inserting the join event data
    app.post(
      `/joinedEvent`,
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const newJoinedEvent = req.body;
        const { email, groupID } = newJoinedEvent;
        const doesEventExist = await upvotedPostCollection.findOne({
          email,
          groupID,
        });
        if (doesEventExist) {
          return res
            .status(409)
            .json({ message: "Already joined this event." });
        }
        const result = await upvotedPostCollection.insertOne(newJoinedEvent);
        res.send(result);
      }
    );

    // getting the joined events of a specific user
    app.get(
      `/joinedEvent`,
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;
        const query = { email };
        const joinedEventsSortedByDate = await upvotedPostCollection
          .find(query)
          .sort({ startDate: 1 })
          .toArray();

        res.send(joinedEventsSortedByDate);
      }
    );
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
