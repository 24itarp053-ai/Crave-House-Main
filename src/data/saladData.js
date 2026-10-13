import greekSaladImg from '../assets/images/greek-salad.jpg';
import gardenSaladImg from '../assets/images/garden-salad.jpg';
import cornSaladImg from '../assets/images/corn-salad.jpg';
import caesarVegSaladImg from '../assets/images/caesar-veg-salad.jpg';
import cucumberSaladImg from '../assets/images/cucumber-salad.jpg';

const saladData = [
  {
    id: 1,
    name: 'Greek Salad',
    price: '₹169',
    description: 'Crisp cucumbers, juicy tomatoes, olives, red onions, and rich feta cheese.',
    rating: 4.5,
    image: greekSaladImg,
  },
  {
    id: 2,
    name: 'Garden Salad',
    price: '₹149',
    description: 'Fresh garden greens tossed with shredded carrots, cucumbers, and cherry tomatoes.',
    rating: 4.3,
    image: gardenSaladImg,
  },
  {
    id: 3,
    name: 'Corn Salad',
    price: '₹159',
    description: 'Sweet corn, colorful bell peppers, and fresh herbs in a light citrus dressing.',
    rating: 4.4,
    image: cornSaladImg,
  },
  {
    id: 4,
    name: 'Caesar Veg Salad',
    price: '₹189',
    description: 'Crisp romaine lettuce, crunchy croutons, and parmesan tossed in creamy Caesar dressing.',
    rating: 4.7,
    image: caesarVegSaladImg,
  },
  {
    id: 5,
    name: 'Cucumber Salad',
    price: '₹139',
    description: 'Thinly sliced cucumbers and onions dressed in a refreshing vinaigrette.',
    rating: 4.2,
    image: cucumberSaladImg,
  },
];

export default saladData;
