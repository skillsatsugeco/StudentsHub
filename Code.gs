function doGet(e) {
  // We no longer return HtmlService since the frontend is running locally
  return ContentService.createTextOutput("Student Hub API is active and running successfully.")
          .setMimeType(ContentService.MimeType.TEXT);
}

// REST API endpoint to intercept cross-origin fetches from the local script.js
function doPost(e) {
  // Required to accept POST options correctly
  if (typeof e !== 'undefined' && e.postData && e.postData.contents) {
    try {
      const req = JSON.parse(e.postData.contents);
      const action = req.action;
      const args = req.args || [];
      
      let result = null;
      if (action === 'getInitialDataBlock') result = getInitialDataBlock();
      else if (action === 'registerUser') result = registerUser(args[0]);
      else if (action === 'loginUser') result = loginUser(args[0], args[1]);
      else if (action === 'updateProfile') result = updateProfile(args[0]);
      else if (action === 'getUserProfile') result = getUserProfile(args[0]);
      else if (action === 'getActiveProducts') result = getActiveProducts();
      else if (action === 'addProduct') result = addProduct(args[0]);
      else if (action === 'deleteProduct') result = deleteProduct(args[0], args[1], args[2]);
      else if (action === 'getPlatformStats') result = getPlatformStats();
      else throw new Error("Invalid action requested.");
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "No data sent." }))
        .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(sheetName) {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error("Database not setup. Please run setupDatabase() from the editor first.");
  return SpreadsheetApp.openById(id).getSheetByName(sheetName);
}

function setupDatabase() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SPREADSHEET_ID')) {
    Logger.log('Database already set up: ' + props.getProperty('SPREADSHEET_ID'));
    return;
  }

  // Create a new Spreadsheet in the root of Google Drive
  const ss = SpreadsheetApp.create('StudentHub_DB');
  const id = ss.getId();
  props.setProperty('SPREADSHEET_ID', id);

  // Setup Users sheet (rename default sheet)
  let sheet = ss.getSheets()[0];
  sheet.setName('Users');
  sheet.appendRow(['User ID', 'Full Name', 'Email', 'Password', 'University', 'Phone Number', 'Business Name', 'Business Description', 'Logo URL', 'Registration Date', 'Role']);

  // Setup Products sheet
  sheet = ss.insertSheet('Products');
  sheet.appendRow(['Product ID', 'User ID', 'Product Name', 'Description', 'Category', 'Price', 'Quantity', 'Image URL', 'Date Added', 'Status', 'Unit']);

  // Setup Categories sheet
  sheet = ss.insertSheet('Categories');
  sheet.appendRow(['Category ID', 'Category Name']);
  sheet.appendRow(['1', 'Fashion']);
  sheet.appendRow(['2', 'Electronics']);
  sheet.appendRow(['3', 'Food & Beverages']);

  // Setup Settings sheet
  sheet = ss.insertSheet('Settings');
  sheet.appendRow(['Property', 'Value']);

  Logger.log('Database successfully created! The script is now linked to your new Database.');
}

function generateId() {
  return Utilities.getUuid();
}

// ==========================================
// USER AUTHENTICATION & PROFILE
// ==========================================

function registerUser(userData) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  
  // Check if email already exists
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === userData.email) {
      return { success: false, message: 'Email already registered.' };
    }
  }

  const userId = generateId();
  const date = new Date().toISOString();
  
  // Columns: User ID, Full Name, Email, Password, University, Phone Number, Business Name, Business Description, Logo URL, Registration Date, Role
  sheet.appendRow([
    userId,
    userData.fullName,
    userData.email,
    userData.password, // In a real app, hash this!
    userData.university,
    userData.phoneNumber,
    userData.businessName,
    userData.businessDescription || '',
    userData.logoUrl || '',
    date,
    userData.email === 'admin@admin.com' ? 'admin' : 'student' // Simple demo admin capability
  ]);

  return { success: true, message: 'Registration successful. Please login.', userId: userId };
}

function loginUser(email, password) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email && data[i][3] === password) {
      return {
        success: true,
        user: {
          userId: data[i][0],
          fullName: data[i][1],
          email: data[i][2],
          university: data[i][4],
          phoneNumber: data[i][5],
          businessName: data[i][6],
          businessDescription: data[i][7],
          logoUrl: data[i][8],
          role: data[i][10] || 'student'
        }
      };
    }
  }
  
  return { success: false, message: 'Invalid email or password.' };
}

function updateProfile(userData) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userData.userId) {
      // Assuming headers matched sequence. updating specific columns
      sheet.getRange(i + 1, 2).setValue(userData.fullName);
      sheet.getRange(i + 1, 5).setValue(userData.university);
      sheet.getRange(i + 1, 6).setValue(userData.phoneNumber);
      sheet.getRange(i + 1, 7).setValue(userData.businessName);
      sheet.getRange(i + 1, 8).setValue(userData.businessDescription);
      sheet.getRange(i + 1, 9).setValue(userData.logoUrl);
      
      return { success: true, message: 'Profile updated successfully.' };
    }
  }
  return { success: false, message: 'User not found.' };
}

function getUserProfile(userId) {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
       return {
          userId: data[i][0],
          fullName: data[i][1],
          email: data[i][2],
          university: data[i][4],
          phoneNumber: data[i][5],
          businessName: data[i][6],
          businessDescription: data[i][7],
          logoUrl: data[i][8]
       };
    }
  }
  return null;
}

// ==========================================
// PRODUCTS CRUD
// ==========================================

function getActiveProducts() {
  const sheet = getSheet('Products');
  const data = sheet.getDataRange().getValues();
  const products = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] !== 'Deleted') {
      products.push({
        productId: data[i][0],
        userId: data[i][1],
        productName: data[i][2],
        description: data[i][3],
        category: data[i][4],
        price: data[i][5],
        quantity: data[i][6],
        imageUrl: data[i][7],
        dateAdded: data[i][8],
        status: data[i][9],
        unit: data[i][10] || 'piece'
      });
    }
  }
  
  // Enrich with user info
  const usersSheet = getSheet('Users');
  const usersData = usersSheet.getDataRange().getValues();
  const usersMap = {};
  for(let i=1; i<usersData.length; i++){
    usersMap[usersData[i][0]] = {
      businessName: usersData[i][6],
      university: usersData[i][4],
      phoneNumber: usersData[i][5],
      email: usersData[i][2]
    };
  }

  products.forEach(p => {
    const u = usersMap[p.userId];
    if(u) {
      p.businessName = u.businessName;
      p.university = u.university;
      p.phoneNumber = u.phoneNumber;
      p.sellerEmail = u.email;
    }
  });

  return products.reverse(); // newest first
}

function addProduct(productData) {
  const sheet = getSheet('Products');
  const productId = generateId();
  const date = new Date().toISOString();
  
  sheet.appendRow([
    productId,
    productData.userId,
    productData.productName,
    productData.description,
    productData.category,
    productData.price,
    productData.quantity,
    productData.imageUrl || '',
    date,
    'Active',
    productData.unit || 'piece'
  ]);
  
  return { success: true, message: 'Product added successfully.' };
}

function updateProduct(productData) {
  const sheet = getSheet('Products');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === productData.productId && data[i][1] === productData.userId) {
      sheet.getRange(i + 1, 3).setValue(productData.productName);
      sheet.getRange(i + 1, 4).setValue(productData.description);
      sheet.getRange(i + 1, 5).setValue(productData.category);
      sheet.getRange(i + 1, 6).setValue(productData.price);
      sheet.getRange(i + 1, 7).setValue(productData.quantity);
      if (productData.imageUrl) {
        sheet.getRange(i + 1, 8).setValue(productData.imageUrl);
      }
      return { success: true, message: 'Product updated successfully.' };
    }
  }
  return { success: false, message: 'Product not found or access denied.' };
}

function deleteProduct(productId, userId, role) {
  const sheet = getSheet('Products');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // If admin, ignore userId check
    if (data[i][0] === productId && (data[i][1] === userId || role === 'admin')) {
      sheet.getRange(i + 1, 10).setValue('Deleted');
      return { success: true, message: 'Product deleted successfully.' };
    }
  }
  
  return { success: false, message: 'Product not found.' };
}


// ==========================================
// CATEGORIES & ADMIN
// ==========================================

function getCategories() {
  const sheet = getSheet('Categories');
  if(!sheet) return [{categoryName: 'Fashion'}, {categoryName: 'Electronics'}]; // fallback
  const data = sheet.getDataRange().getValues();
  const categories = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) {
      categories.push({
        categoryId: data[i][0],
        categoryName: data[i][1]
      });
    }
  }
  return categories;
}

function getPlatformStats() {
  const users = getSheet('Users').getLastRow() - 1;
  const products = getSheet('Products').getDataRange().getValues().filter((row, i) => i > 0 && row[9] !== 'Deleted').length;
  const categories = getSheet('Categories').getLastRow() - 1;

  return {
    totalUsers: users > 0 ? users : 0,
    totalProducts: products > 0 ? products : 0,
    totalCategories: categories > 0 ? categories : 0
  };
}

function getInitialDataBlock() {
  return {
    categories: getCategories(),
    products: getActiveProducts()
  };
}
