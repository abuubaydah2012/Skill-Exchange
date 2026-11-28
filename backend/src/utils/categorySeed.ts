import { Category } from '../models/Category.js';
import { Subcategory } from '../models/Subcategory.js';
import { Skill } from '../models/Skill.js';

export const toSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export interface SeedCategoryDef {
  name: string;
  description: string;
  icon: string;
  subcategories: string[];
}

export const INITIAL_CATEGORIES: SeedCategoryDef[] = [
  {
    name: 'Technology & Programming',
    description: 'Software engineering, AI, cloud computing, cybersecurity, and data.',
    icon: 'Code2',
    subcategories: [
      'Web Development',
      'App Development',
      'Artificial Intelligence',
      'Machine Learning',
      'Python',
      'Java',
      'C++',
      'Cybersecurity',
      'Data Science',
      'Cloud & DevOps',
    ],
  },
  {
    name: 'Design & Creativity',
    description: 'Visual design, product UX, branding, motion graphics, and illustration.',
    icon: 'Palette',
    subcategories: [
      'Graphic Design',
      'UI/UX Design',
      'Logo Design',
      'Animation',
      'Video Editing',
      'Illustration',
      '3D Modeling',
    ],
  },
  {
    name: 'Languages & Communication',
    description: 'World languages, public speaking, writing, and translation.',
    icon: 'Languages',
    subcategories: [
      'English',
      'Spanish',
      'Korean',
      'Japanese',
      'French',
      'German',
      'Public Speaking',
      'Creative Writing',
      'Translation',
    ],
  },
  {
    name: 'Music & Performing Arts',
    description: 'Instruments, vocal training, music theory, production, and theater.',
    icon: 'Music',
    subcategories: [
      'Guitar',
      'Piano & Keyboard',
      'Vocal Coaching',
      'Music Production',
      'Music Theory',
      'Acting & Drama',
      'Dance',
    ],
  },
  {
    name: 'Business & Marketing',
    description: 'Entrepreneurship, digital marketing, finance, sales, and strategy.',
    icon: 'Briefcase',
    subcategories: [
      'Digital Marketing',
      'SEO & Content Strategy',
      'Product Management',
      'Entrepreneurship',
      'Financial Literacy',
      'Sales & Negotiation',
    ],
  },
  {
    name: 'Photography & Media',
    description: 'Digital photography, cinematography, lighting, and post-production.',
    icon: 'Camera',
    subcategories: [
      'Portrait Photography',
      'Photo Editing & Lightroom',
      'Videography',
      'Podcasting & Audio',
      'Content Creation',
    ],
  },
  {
    name: 'Education & Academics',
    description: 'Tutoring, test preparation, mathematics, humanities, and study skills.',
    icon: 'GraduationCap',
    subcategories: [
      'Mathematics',
      'Test Preparation',
      'History & Literature',
      'Academic Writing',
      'Study Skills',
    ],
  },
  {
    name: 'Lifestyle, Health & Fitness',
    description: 'Nutrition, culinary arts, yoga, strength training, and mindfulness.',
    icon: 'HeartPulse',
    subcategories: [
      'Cooking & Culinary Arts',
      'Yoga & Mindfulness',
      'Strength & Conditioning',
      'Nutrition & Wellness',
      'Personal Styling',
    ],
  },
  {
    name: 'Crafts & DIY',
    description: 'Handmade crafts, woodworking, sewing, pottery, and home projects.',
    icon: 'Scissors',
    subcategories: [
      'Woodworking',
      'Sewing & Tailoring',
      'Pottery & Ceramics',
      'Knitting & Crochet',
      'Home DIY & Upcycling',
    ],
  },
  {
    name: 'Science & Research',
    description: 'Physics, biology, chemistry, environmental science, and research methods.',
    icon: 'FlaskConical',
    subcategories: [
      'Physics',
      'Biology',
      'Chemistry',
      'Environmental Science',
      'Research Methodology',
    ],
  },
  {
    name: 'Engineering & Technical Skills',
    description: 'Mechanical, electrical, CAD, robotics, and hardware prototyping.',
    icon: 'Cpu',
    subcategories: [
      'CAD & 3D Printing',
      'Electronics & Arduino',
      'Robotics',
      'Mechanical Engineering',
      'Civil & Architecture Basics',
    ],
  },
  {
    name: 'Personal Development',
    description: 'Productivity, leadership, career coaching, and time management.',
    icon: 'Sparkles',
    subcategories: [
      'Career Coaching',
      'Leadership & Management',
      'Time Management',
      'Interview Preparation',
      'Emotional Intelligence',
    ],
  },
  {
    name: 'Sports & Recreation',
    description: 'Chess, martial arts, swimming, tennis, and outdoor activities.',
    icon: 'Trophy',
    subcategories: [
      'Chess & Strategy Games',
      'Martial Arts',
      'Tennis & Racket Sports',
      'Running & Endurance',
      'Outdoor & Survival Skills',
    ],
  },
  {
    name: 'Home & Professional Services',
    description: 'Home maintenance, interior organization, legal/tax basics, and trades.',
    icon: 'Wrench',
    subcategories: [
      'Home Repair & Maintenance',
      'Interior Organization',
      'Gardening & Landscaping',
      'Bookkeeping & Tax Basics',
    ],
  },
  {
    name: 'Other & Specialized Skills',
    description: 'Niche, emerging, and interdisciplinary skills not listed elsewhere.',
    icon: 'Layers',
    subcategories: [
      'Interdisciplinary Skills',
      'Emerging Topics',
      'Community & Volunteering',
    ],
  },
];

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  development: 'Technology & Programming',
  'software engineering': 'Technology & Programming',
  'web development': 'Technology & Programming',
  design: 'Design & Creativity',
  languages: 'Languages & Communication',
  music: 'Music & Performing Arts',
  'music & audio': 'Music & Performing Arts',
  business: 'Business & Marketing',
  marketing: 'Business & Marketing',
  photography: 'Photography & Media',
  culinary: 'Lifestyle, Health & Fitness',
};

export const ensureDefaultCategoriesAndMigrateSkills = async (): Promise<void> => {
  try {
    const categoryMap = new Map<string, any>();

    for (let idx = 0; idx < INITIAL_CATEGORIES.length; idx++) {
      const def = INITIAL_CATEGORIES[idx];
      const slug = toSlug(def.name);

      let cat = await Category.findOne({ slug });
      if (!cat) {
        cat = await Category.create({
          name: def.name,
          slug,
          description: def.description,
          icon: def.icon,
          isActive: true,
          displayOrder: idx + 1,
        });
      }
      categoryMap.set(def.name.toLowerCase(), cat);

      for (const subName of def.subcategories) {
        const subSlug = toSlug(subName);
        const existingSub = await Subcategory.findOne({ categoryId: cat._id, slug: subSlug });
        if (!existingSub) {
          await Subcategory.create({
            categoryId: cat._id,
            name: subName,
            slug: subSlug,
            isActive: true,
          });
        }
      }
    }

    // Safely migrate legacy Skill documents that lack categoryId or use legacy category names
    const skillsToCheck = await Skill.find({
      $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
    });

    for (const skill of skillsToCheck) {
      const rawCat = (skill.category || '').trim();
      const lower = rawCat.toLowerCase();
      const mappedName = LEGACY_CATEGORY_MAP[lower] || rawCat;
      const targetCat = categoryMap.get(mappedName.toLowerCase()) || (await Category.findOne({ slug: toSlug(mappedName) }));

      if (targetCat) {
        skill.category = targetCat.name;
        skill.categoryId = targetCat._id;
        await skill.save();
      }
    }
  } catch (err) {
    console.warn('[Category Seed/Migration Warning]', err);
  }
};
