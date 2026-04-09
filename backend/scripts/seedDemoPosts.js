import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Post from '../models/Post.js';

dotenv.config();

const DEMO_USER_EMAIL = 'demo.seed@localpulse.app';
const DEMO_USER_PASSWORD = 'demo123456';
const POSTS_PER_DISTRICT = 3;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const readJSON = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));

const divisions = readJSON('frontend/src/utils/bd/divisions.json');
const districts = readJSON('frontend/src/utils/bd/districts.json');
const upazilas = readJSON('frontend/src/utils/bd/upazilas.json');

const categories = ['Safety', 'Food', 'Transport', 'Event', 'Warning', 'Tip', 'Infrastructure', 'General'];
const severities = ['Info', 'Caution', 'Urgent'];

const titleTemplates = [
  'Local update from {district}',
  '{district} community alert',
  'Situation report in {district}',
  'Heads up for residents of {district}',
  'Neighborhood issue spotted in {district}',
];

const bodyTemplates = [
  'This is a demo post for presentation purposes. Community members in {district} should stay informed and check updates from nearby areas.',
  'Demo content for client showcase: people around {district} reported this local situation and suggested everyone remain aware and cooperative.',
  'Testing post data for LocalPulse demo in {district}. This message helps verify location filters, category views, and severity tagging.',
  'Sample report generated for {district}. Use this item to validate map markers, feed sorting, and post detail rendering in the app.',
];

const tagTemplates = [
  ['demo', 'community'],
  ['localpulse', 'testdata'],
  ['awareness', 'sample'],
  ['presentation', 'trial'],
  ['nearby', 'notice'],
];

const getRandomItem = (items, seed) => items[seed % items.length];

const buildDisplayLabel = (landmark, districtName, divisionName) => `${landmark}, ${districtName}, ${divisionName}`;

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined in backend/.env');
  }
  await mongoose.connect(process.env.MONGO_URI);
}

async function ensureDemoUser() {
  let demoUser = await User.findOne({ email: DEMO_USER_EMAIL });

  if (!demoUser) {
    const hashedPassword = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
    demoUser = await User.create({
      name: 'LocalPulse Demo Seeder',
      email: DEMO_USER_EMAIL,
      password: hashedPassword,
      bio: 'Automated account for generating demo posts.',
    });
    console.log(`Created demo user: ${demoUser.email}`);
  } else {
    console.log(`Using existing demo user: ${demoUser.email}`);
  }

  return demoUser;
}

function buildPostsForDistrict(district, index, authorId) {
  const division = divisions.find((d) => d.id === district.division_id);
  if (!division) {
    return [];
  }

  const districtUpazilas = upazilas.filter((u) => u.district_id === district.id);

  const posts = [];
  for (let i = 0; i < POSTS_PER_DISTRICT; i += 1) {
    const seed = index * POSTS_PER_DISTRICT + i;
    const upazila = districtUpazilas.length > 0 ? districtUpazilas[seed % districtUpazilas.length] : undefined;
    const title = getRandomItem(titleTemplates, seed).replaceAll('{district}', district.name);
    const body = getRandomItem(bodyTemplates, seed).replaceAll('{district}', district.name);
    const category = getRandomItem(categories, seed);
    const severityLevel = getRandomItem(severities, seed);
    const tags = getRandomItem(tagTemplates, seed);
    const landmark = `Ward ${((seed % 12) + 1).toString()}, ${district.name}`;

    posts.push({
      author: authorId,
      title,
      body,
      category,
      severityLevel,
      division: {
        id: division.id,
        name: division.name,
        lat: division.lat,
        lng: division.lng,
      },
      district: {
        id: district.id,
        name: district.name,
        lat: district.lat,
        lng: district.lng,
      },
      upazila: upazila ? { id: upazila.id, name: upazila.name } : undefined,
      landmark,
      displayLabel: buildDisplayLabel(landmark, district.name, division.name),
      location: {
        type: 'Point',
        coordinates: [district.lng, district.lat],
      },
      tags,
      images: [],
      isResolved: seed % 9 === 0,
      viewCount: seed % 40,
      createdAt: new Date(Date.now() - seed * 3600_000),
      updatedAt: new Date(),
    });
  }

  return posts;
}

async function seedDemoPosts() {
  await connectDB();
  const demoUser = await ensureDemoUser();

  const deleteResult = await Post.deleteMany({ author: demoUser._id });
  console.log(`Cleared ${deleteResult.deletedCount} previous demo posts`);

  const posts = districts.flatMap((district, index) =>
    buildPostsForDistrict(district, index, demoUser._id)
  );

  const inserted = await Post.insertMany(posts, { ordered: false });

  const districtCount = new Set(inserted.map((p) => p.district?.id)).size;
  console.log(`Inserted ${inserted.length} demo posts across ${districtCount} districts.`);
  console.log(`Demo user login email: ${DEMO_USER_EMAIL}`);
  console.log(`Demo user password: ${DEMO_USER_PASSWORD}`);
}

seedDemoPosts()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Failed to seed demo posts:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  });
