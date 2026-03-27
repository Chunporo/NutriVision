const defaultData = {
  "user": {
    "name": "Samantha Ruth",
    "email": "samantha123@gmail.com"
  },
  "goals": {
    "cal": 2450,
    "pro": 145,
    "car": 280,
    "fat": 75
  },
  "logs": [
    {
      "id": 1,
      "name": "Avocado & Egg Toast",
      "kcal": 320,
      "time": "08:30 am",
      "icon": "🥗",
      "type": "Breakfast"
    },
    {
      "id": 2,
      "name": "Grilled Salmon Bowl",
      "kcal": 542,
      "time": "01:45 pm",
      "icon": "🍛",
      "type": "Lunch"
    },
    {
      "id": 3,
      "name": "Mixed Berries",
      "kcal": 120,
      "time": "04:15 pm",
      "icon": "🍇",
      "type": "Snack"
    },
    {
      "id": 4,
      "name": "Roast Chicken Salad",
      "kcal": 420,
      "time": "08:00 pm",
      "icon": "🍗",
      "type": "Dinner"
    }
  ]
};

const DB = {
  get: () => {
    const raw = localStorage.getItem('nutrivision_db');
    if (!raw) {
       localStorage.setItem('nutrivision_db', JSON.stringify(defaultData));
       return defaultData;
    }
    return JSON.parse(raw);
  },
  save: (data) => {
    localStorage.setItem('nutrivision_db', JSON.stringify(data));
    // Optional: Synchronize with server if available
    fetch('/api/data', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
    }).catch(e => console.log('Server sync skipped (offline mode)'));
  },
  addLog: (entry) => {
     const data = DB.get();
     entry.id = Date.now();
     data.logs.unshift(entry);
     DB.save(data);
  }
};
