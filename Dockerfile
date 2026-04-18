# Gunakan node versi 20
FROM node:20

# Buat folder kerja di dalam kontainer
WORKDIR /app

# Copy package.json dan install library
COPY package*.json ./
RUN npm install

# Copy semua file project kamu ke kontainer
COPY . .

# Beritahu port mana yang dibuka
EXPOSE 3000

# Jalankan aplikasi
CMD ["node", "app.js"]