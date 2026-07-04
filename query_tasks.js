const mongoose = require('mongoose');

const mongoUri = 'mongodb+srv://eldabaamostafa01_db_user:qDjFOSuXYAhYjnsS@cluster0.rmqw4wx.mongodb.net/legal_office_db?appName=Cluster0';

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const tasks = await Task.find({}).lean();
  console.log('Total Tasks:', tasks.length);
  if (tasks.length > 0) {
    console.log('First task:', JSON.stringify(tasks[0], null, 2));
    
    // Check if the assignedTo user exists
    const userId = tasks[0].assignedTo;
    const user = await User.findById(userId).lean();
    console.log('AssignedTo User:', user);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
