import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import Jwt from "jsonwebtoken";

//! add this key into the env file
const jwtKey = "jwt-key";

const app = express();
app.use(cors());
app.use(bodyParser.json());
const port = 5000;

mongoose
  .connect("mongodb://127.0.0.1:27017/management")
  .then(() => {
    console.log("MongoDb Connected");
  })
  .catch((err) => {
    console.log("mongodb Error: ", err);
  });
const signupSchema = new mongoose.Schema({
  upName: {
    type: String,
    required: true,
  },
  upEmail: {
    type: String,
    required: true,
    unique: true,
  },
  upPassword: {
    type: String,
    required: true,
  },
  tasks: [
    {
      taskAssignTitle: {
        type: String,
      },
      taskAssignDesc: {
        type: String,
      },
      taskStatus: {
        type: Boolean,
      },
      taskAssignTime: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  tasksDelete: [
    {
      taskDeletedTitle: {
        type: String,
      },
      taskDeletedTitleDesc: {
        type: String,
      },
    },
  ],

  taskCompleted: [
    {
      taskCompletedTitle: {
        type: String,
      },
      taskCompletedDesc: {
        type: String,
      },
    },
  ],
});

const signUpModel = mongoose.model("signup", signupSchema);

const adminSchema = new mongoose.Schema({
  adminName: {
    type: String,
    required: true,
    unique: true,
  },
  adminPassword: {
    type: String,
    required: true,
    unique: true,
  },
});

const adminModel = mongoose.model("admin", adminSchema);

app.get("/", (req, res) => {
  res.send("<h1>Welcome!</h1>");
});

app.post("/signup", async (req, res) => {
  const { sendSignupName, sendSingupEmail, sendSignupPassword } = req.body;
  try {
    const user = await signUpModel.findOne({ upEmail: sendSingupEmail });
    if (user) {
      res.status(200).json({ userExist: "exist" });
    } else {
      const addSignup = await signUpModel.create({
        upName: sendSignupName,
        upEmail: sendSingupEmail,
        upPassword: sendSignupPassword,
      });
      console.log("user sign up", addSignup);
      res.status(200).json({ signup: "signup" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error from signup" });
  }
});

app.get("/signin", async (req, res) => {
  const { sendSigninEmail, sendSigninPassword } = req.query;
  try {
    const userExist = await signUpModel.findOne({ upEmail: sendSigninEmail });

    if (userExist && userExist.upPassword === sendSigninPassword) {
      Jwt.sign(
        { userId: sendSigninEmail },
        jwtKey,
        { expiresIn: "2h" },
        (err, token) => {
          if (err) {
            res.status(500).json({ result: "something went wrong with jwt" });
          } else {
            console.log("token genrated");
            return res.status(200).send({
              signin: "signin",
              user: userExist.upName,
              userEmail: userExist.upEmail,
              usetTask: userExist.taskAssignTitle,
              userDesc: userExist.taskAssignDesc,
              userMainArray: userExist.tasks,
              auth: token
            });
          }
        }
      );
    } else if (userExist && userExist.upPassword !== sendSigninPassword) {
      return res
        .status(200)
        .json({ incorrect: "wrong", console: "this shit is incorrect" });
    } else {
      res
        .status(500)
        .json({ userNotFound: "creatUser", error: "create user first" });
    }

    // Send sign-in failed response
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error from signin" });
  }
});

app.get("/admin", async (req, res) => {
  const { sendAdminName, sendAdminPassword } = req.query;
  try {
    const adminExist = await adminModel.findOne({ adminName: sendAdminName });
    if (adminExist && adminExist.adminPassword === sendAdminPassword) {
      Jwt.sign(
        { userId: sendAdminName },
        jwtKey,
        { expiresIn: "2h" },
        (err, token) => {
          if (err) {
            res.status(500).json({ result: "something went wrong with jwt" });
          } 
          else {
            console.log("token genrated");
            res.status(200).json({
              adminSuccess: "adminSuccess",
              adminName: adminExist.adminName,
              auth: token,
              genrated: "genrated",
            });
          }
        }
      );
    } else if (adminExist && adminExist.adminPassword !== sendAdminPassword) {
      res.status(200).json({
        adminExist: "notExist",
      });
    } else {
      res.status(404).json({ adminError: "adminError" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from admin endpoint" });
  }
});

app.get("/userEmails", async (req, res) => {
  try {
    const allUserEmails = await signUpModel.find({}, "upEmail");
    const emails = allUserEmails.map((user) => user.upEmail);
    res.status(200).json({ userEmails: emails });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from userEmails endpoint" });
  }
});

app.post("/assigntask", async (req, res) => {
  const { emailTask, titleTask, descTask } = req.body;
  try {
    const assignTaskToThisUser = await signUpModel.findOne({
      upEmail: emailTask,
    });

    if (assignTaskToThisUser) {
      assignTaskToThisUser.tasks.push({
        taskAssignTitle: titleTask,
        taskAssignDesc: descTask,
        taskStatus: false,
        taskAssignTime: new Date(), // Add timestamp when the task is assigned
      });

      await assignTaskToThisUser.save();

      res.status(200).json({
        message: "Task assigned successfully",
        taskArray: assignTaskToThisUser.tasks,
        taskTime:
          assignTaskToThisUser.tasks[assignTaskToThisUser.tasks.length - 1]
            .taskAssignTime,
      });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from assignTask endpoint" });
  }
});

//!!!!!!!!
app.post("/deleted", async (req, res) => {
  const { emailSend, taskNameSend } = req.body;
  try {
    const user = await signUpModel.findOne({ upEmail: emailSend });

    if (user) {
      // Check if taskNameSend is present in tasks array
      const taskIndex = user.tasks.findIndex(
        (task) => task.taskAssignTitle === taskNameSend
      );

      if (taskIndex !== -1) {
        // Log a message when taskNameSend is found in tasks array
        console.log("Task found inside the tasks");

        // Add the task to the tasksDelete array
        user.tasksDelete.push({
          taskDeletedTitle: user.tasks[taskIndex].taskAssignTitle,
          taskDeletedTitleDesc: user.tasks[taskIndex].taskAssignDesc,
        });

        // Remove the task from the tasks array
        user.tasks.splice(taskIndex, 1);

        // Save the changes to the database
        await user.save();

        // Return the updated tasks array in the response
        res.status(200).json({
          message: "Task deleted successfully",
          updatedTasks: user.tasks,
        });
      } else {
        // If taskNameSend is not found, return an error response
        res.status(404).json({ error: "Task not found" });
      }
    } else {
      // If user is not found, return an error response
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error from admin deleted" });
  }
});

app.get("/remaining", async (req, res) => {
  const { emailSend } = req.query;
  try {
    const user = await signUpModel.findOne({ upEmail: emailSend });

    if (user) {
      // Return the remaining tasks array in the response
      res.status(200).json({ remainingTasks: user.tasks });
    } else {
      // If user is not found, return an error response
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from remaining endpoint" });
  }
});

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// !!!------------------------------------------------------>
app.post("/completed", async (req, res) => {
  const { sendTaskEmail, sendTaskTitle } = req.body;
  try {
    const user = await signUpModel.findOne({ upEmail: sendTaskEmail });

    if (user) {
      // Check if the task is present in the tasks array
      const taskIndex = user.tasks.findIndex(
        (task) => task.taskAssignTitle === sendTaskTitle
      );

      if (taskIndex !== -1) {
        // Move the found task from tasks to completedTasks
        const completedTask = user.tasks.splice(taskIndex, 1)[0];

        user.taskCompleted.push({
          taskCompletedTitle: completedTask.taskAssignTitle,
          taskCompletedDesc: completedTask.taskAssignDesc,
        });

        // Save the changes to the database
        await user.save();

        // Return the updated taskCompleted array in the response
        res.status(200).json({
          message: "Task completed successfully",
          updatedCompletedTasks: user.taskCompleted,
        });
      } else {
        // If the task is not found, return an error response
        res.status(404).json({ error: "Task not found" });
      }
    } else {
      // If the user is not found, return an error response
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from completed endpoint" });
  }
});
// !!!---------------------------------------------------------------->
app.get("/completedget", async (req, res) => {
  const { sendTaskEmail } = req.query;
  try {
    const user = await signUpModel.findOne({ upEmail: sendTaskEmail });

    if (user) {
      // console.log(completeUpdate)
      res.status(200).json({
        completeUpdate: user.tasks,
        completedTasks: user.taskCompleted,
      });
    } else {
      res.status(404).json({
        error: "completed task is not found in teh completedget endpoint",
      });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from completedget endpoint" });
  }
});

app.post("/del", async (req, res) => {
  const { sendUserEmail, sendUserTitle } = req.body;

  try {
    const user = await signUpModel.findOne({ upEmail: sendUserEmail });

    if (user) {
      const taskIndex = user.taskCompleted.findIndex(
        (task) => task.taskCompletedTitle === sendUserTitle
      );

      if (taskIndex !== -1) {
        // Remove the specific task from the taskCompleted array
        user.taskCompleted.splice(taskIndex, 1);

        // Save the changes to the database
        await user.save();

        res.status(200).json({
          message: "Task removed successfully from the taskCompleted array",
          taskCompleted: user.taskCompleted,
        });
      } else {
        res
          .status(404)
          .json({ error: "Task not found in the taskCompleted array" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error from del endpoint" });
  }
});

app.post("/undo", async (req, res) => {
  const { sendUserEmail, sendUserTitle } = req.body;
  try {
    const user = await signUpModel.findOne({ upEmail: sendUserEmail });

    if (user) {
      const taskIndex = user.taskCompleted.findIndex(
        (task) => task.taskCompletedTitle === sendUserTitle
      );

      if (taskIndex !== -1) {
        const undoneTask = user.taskCompleted.splice(taskIndex, 1)[0];

        // Push the undone task back into the tasks array
        user.tasks.push({
          taskAssignTitle: undoneTask.taskCompletedTitle,
          taskAssignDesc: undoneTask.taskCompletedDesc,
          taskStatus: false,
          taskAssignTime: new Date(),
        });

        // Save the changes to the database
        await user.save();

        res.status(200).json({
          message: "Task moved successfully from taskCompleted to tasks",
          taskCompleted: user.taskCompleted,
          tasks: user.tasks,
        });
      } else {
        res
          .status(404)
          .json({ error: "Task not found in taskCompleted array" });
      }
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error from undo endpoint" });
  }
});

app.get("/getTask", async (req, res) => {
  const { value } = req.query;
  try {
    const user = await signUpModel.findOne({ upEmail: value });

    if (user) {
      res
        .status(200)
        .json({ mainTasks: user.tasks, complete: user.taskCompleted });
    } else {
      res.status(404).json({ error: "Data not found" });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Internal Server Error from getTask endpoint" });
  }
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
