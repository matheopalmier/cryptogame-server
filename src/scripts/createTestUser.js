require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// URL de connexion MongoDB
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptogame';

// Schéma utilisateur simplifié pour ce script
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  balance: Number,
  portfolio: Array
});

// Méthode pour hacher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

const User = mongoose.model('User', userSchema);

// Fonction principale
async function createTestUser() {
  try {
    console.log('Connexion à MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connecté à MongoDB');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: 'matheo.palmier42@gmail.com' });
    
    if (existingUser) {
      console.log('Utilisateur de test existe déjà. Mise à jour du mot de passe...');
      // Mettre à jour le mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('azerty', salt);
      await User.updateOne(
        { email: 'matheo.palmier42@gmail.com' },
        { $set: { password: hashedPassword } }
      );
      console.log('Mot de passe mis à jour');
    } else {
      // Créer l'utilisateur de test
      const testUser = new User({
        username: 'matheo',
        email: 'matheo.palmier42@gmail.com',
        password: 'azerty', // Sera haché automatiquement
        balance: 10000,
        portfolio: []
      });
      
      await testUser.save();
      console.log('Utilisateur de test créé avec succès');
    }
    
    // Lister tous les utilisateurs pour vérification
    const users = await User.find({}, { password: 0 });
    console.log('Utilisateurs dans la base de données:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email})`);
    });
    
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

createTestUser(); 