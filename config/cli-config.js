require('dotenv').config();

module.exports = {
  development: {
    username: 'root',
    password: 'wxx0324',
    database: 'answer_pro',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  },
  test: {
    username: 'root',
    password: 'wxx0324',
    database: 'answer_pro_test',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: 'root',
    password: 'wxx0324',
    database: 'answer_pro',
    host: 'localhost',
    port: 3306,
    dialect: 'mysql',
    logging: false
  }
}; 