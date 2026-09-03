require('dotenv').config()
const mongoose = require('mongoose')

const COLLECTIONS = [
  'users',
  'organizations',
  'memberships',
  'projects',
  'tasks',
  'teams',
  'comments',
  'activities',
  'notifications',
]

async function initDatabase() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set in server/.env')
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db
  if (!db) {
    throw new Error('Failed to get database handle')
  }

  console.log(`Connected to cluster — initializing database "${db.databaseName}"`)

  for (const name of COLLECTIONS) {
    const exists = await db.listCollections({ name }).hasNext()
    if (!exists) {
      await db.createCollection(name)
      console.log(`  + created collection: ${name}`)
    } else {
      console.log(`  · collection exists: ${name}`)
    }
  }

  await db.collection('_meta').updateOne(
    { key: 'app' },
    {
      $set: {
        key: 'app',
        name: 'WorkSync',
        initializedAt: new Date(),
        version: '1.0.0',
      },
    },
    { upsert: true }
  )

  console.log('  + wrote _meta app marker')
  console.log(`\nDatabase "${db.databaseName}" is ready in MongoDB Atlas.`)

  await mongoose.disconnect()
}

initDatabase().catch((error) => {
  console.error('Database init failed:', error.message)
  process.exit(1)
})
