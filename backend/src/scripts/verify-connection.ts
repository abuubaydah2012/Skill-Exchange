import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const sanitizeUri = (uri: string): string => {
  try {
    return uri.replace(/:([^:@]+)@/, ':****@');
  } catch {
    return 'mongodb+srv://****@cluster...';
  }
};

const runVerification = async () => {
  console.log('====================================================');
  console.log('MongoDB Atlas Database Connection Verification');
  console.log('====================================================');

  const mongoUri = process.env.MONGODB_URI;

  // Step 1: Check if MONGODB_URI exists
  if (!mongoUri || mongoUri.trim() === '') {
    console.error('\n❌ FAIL: MONGODB_URI environment variable is not defined.');
    console.error('Please configure MONGODB_URI in backend/.env:');
    console.error('MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/skill_exchange?retryWrites=true&w=majority');
    process.exit(1);
  }

  console.log(`\n1. Connection String: Found`);
  console.log(`   Masked URI: ${sanitizeUri(mongoUri)}`);

  // Step 2: Verify URI targets skill_exchange
  const urlPattern = /mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/;
  const match = mongoUri.match(urlPattern);
  const targetDbFromUri = match ? match[1] : null;

  console.log(`\n2. Target Database in URI: ${targetDbFromUri || '(not specified in URI path)'}`);
  if (targetDbFromUri !== 'skill_exchange') {
    console.warn(`   ⚠️ WARNING: URI points to "${targetDbFromUri}", expected "skill_exchange".`);
  } else {
    console.log(`   ✅ Target database matches "skill_exchange".`);
  }

  // Step 3: Connect via Mongoose
  console.log(`\n3. Connecting to MongoDB Atlas via Mongoose...`);
  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    });

    const activeDbName = conn.connection.db?.databaseName;
    console.log(`   ✅ Successfully connected to Atlas!`);
    console.log(`   Active Database: ${activeDbName}`);
    console.log(`   Host: ${conn.connection.host}`);

    if (activeDbName !== 'skill_exchange') {
      console.warn(`   ⚠️ WARNING: Connected to database "${activeDbName}", not "skill_exchange".`);
    } else {
      console.log(`   ✅ Confirmed: Connection is bound to "skill_exchange".`);
    }

    // Step 4: List existing collections
    console.log(`\n4. Inspecting existing collections in "${activeDbName}"...`);
    const collections = await conn.connection.db!.listCollections().toArray();
    if (collections.length === 0) {
      console.log(`   ℹ️ Database "${activeDbName}" currently has 0 collections (clean / newly created database).`);
    } else {
      console.log(`   Found ${collections.length} collection(s):`);
      collections.forEach((col, idx) => {
        console.log(`     ${idx + 1}. ${col.name} (${col.type || 'collection'})`);
      });
    }

    // Step 5: Test inserting and retrieving a test document
    console.log(`\n5. Testing document insertion and retrieval in "${activeDbName}"...`);
    const testCollection = conn.connection.db!.collection('_connection_verifications');
    const testDocId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const testDoc = {
      testId: testDocId,
      database: activeDbName,
      source: 'skill-exchange-backend-verifier',
      timestamp: new Date().toISOString(),
      status: 'active-verification',
    };

    const insertResult = await testCollection.insertOne(testDoc);
    console.log(`   ✅ Insert succeeded! Document _id: ${insertResult.insertedId}`);

    const retrievedDoc = await testCollection.findOne({ testId: testDocId });
    if (!retrievedDoc || retrievedDoc.testId !== testDocId) {
      throw new Error(`Retrieved document did not match inserted testId: ${testDocId}`);
    }
    console.log(`   ✅ Retrieval succeeded! Verified document from database:`);
    console.log(`      testId: ${retrievedDoc.testId}`);
    console.log(`      timestamp: ${retrievedDoc.timestamp}`);

    // Step 6: Clean up test document
    await testCollection.deleteOne({ testId: testDocId });
    console.log(`   ✅ Cleanup succeeded! Temporary verification document removed.`);

    console.log('\n====================================================');
    console.log('✅ ALL CHECKS PASSED: Backend is fully connected to skill_exchange!');
    console.log('====================================================');
  } catch (error: any) {
    console.error(`\n❌ Atlas Connection Error:`, error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

runVerification();
