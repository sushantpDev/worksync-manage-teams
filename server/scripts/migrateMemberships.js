require('dotenv').config()
const mongoose = require('mongoose')

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI)

  const db = mongoose.connection.db
  const users = await db.collection('users').find({ organizationId: { $exists: true } }).toArray()

  let created = 0
  for (const user of users) {
    const exists = await db.collection('memberships').findOne({
      userId: user._id,
      organizationId: user.organizationId,
    })

    if (!exists) {
      await db.collection('memberships').insertOne({
        userId: user._id,
        organizationId: user.organizationId,
        role: user.role || 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      created++
    }

    if (!user.defaultOrganizationId && user.organizationId) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { defaultOrganizationId: user.organizationId } }
      )
    }
  }

  console.log(`Migration complete. Created ${created} membership(s).`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error(err)
  process.exit(1)
})
