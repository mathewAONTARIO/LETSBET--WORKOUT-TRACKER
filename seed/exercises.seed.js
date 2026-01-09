require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Exercise = require('../models/Exercise');

async function seedExercises() {
  try {
    await connectDB();

    console.log('🌱 Seeding exercises...');

    // ⚠️ Clears ONLY the Exercise collection
    await Exercise.deleteMany({});

    const exercises = [
      {
        name: 'Bench Press',
        category: 'Push',
        muscles: ['Chest', 'Triceps', 'Shoulders'],
        instructions: [
          'Lie flat on the bench with feet planted on the floor',
          'Grip the bar slightly wider than shoulder width',
          'Lower the bar to your mid-chest under control',
          'Press the bar back up until arms are fully extended'
        ],
        tips: [
          'Keep your shoulder blades retracted',
          'Do not bounce the bar off your chest'
        ],
        imageUrl: 'https://exrx.net/Articulations/BenchPress.gif',
        videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
        equipment: ['Barbell', 'Bench'],
        difficulty: 'Beginner'
      },

      {
        name: 'Squat',
        category: 'Legs',
        muscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
        instructions: [
          'Position the barbell across your upper back',
          'Stand with feet shoulder-width apart',
          'Lower your hips until thighs are parallel to the floor',
          'Drive through your heels to stand back up'
        ],
        tips: [
          'Keep your chest up',
          'Brace your core before descending'
        ],
        imageUrl: 'https://exrx.net/Articulations/Squat.gif',
        videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
        equipment: ['Barbell'],
        difficulty: 'Beginner'
      },

      {
        name: 'Deadlift',
        category: 'Pull',
        muscles: ['Back', 'Glutes', 'Hamstrings'],
        instructions: [
          'Stand with mid-foot under the barbell',
          'Grip the bar just outside your legs',
          'Keep your back flat and chest up',
          'Drive through the floor and stand tall'
        ],
        tips: [
          'Do not round your lower back',
          'Keep the bar close to your shins'
        ],
        imageUrl: 'https://exrx.net/Articulations/Deadlift.gif',
        videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
        equipment: ['Barbell'],
        difficulty: 'Intermediate'
      },

      {
        name: 'Pull-Up',
        category: 'Pull',
        muscles: ['Lats', 'Biceps', 'Upper Back'],
        instructions: [
          'Grip the pull-up bar with palms facing away',
          'Hang with arms fully extended',
          'Pull your chest toward the bar',
          'Lower yourself with control'
        ],
        tips: [
          'Avoid swinging',
          'Engage your lats before pulling'
        ],
        imageUrl: 'https://exrx.net/Articulations/PullUp.gif',
        videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
        equipment: ['Pull-up Bar'],
        difficulty: 'Intermediate'
      },

      {
        name: 'Plank',
        category: 'Core',
        muscles: ['Abs', 'Lower Back'],
        instructions: [
          'Place forearms on the floor',
          'Extend legs behind you',
          'Keep body in a straight line',
          'Hold while breathing steadily'
        ],
        tips: [
          'Do not let hips sag',
          'Squeeze your glutes'
        ],
        imageUrl: 'https://exrx.net/Articulations/Plank.gif',
        equipment: ['Bodyweight'],
        difficulty: 'Beginner'
      }
    ];

    await Exercise.insertMany(exercises);

    console.log(`✅ Seeded ${exercises.length} exercises`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seedExercises();