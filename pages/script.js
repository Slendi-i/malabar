import React from 'react';
import Button from '@mui/material/Button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">
        Добро пожаловать на мой сайт!
      </h1>
      <p className="text-lg text-gray-700 mb-8">
        Это пример страницы с использованием Next.js, Material-UI и Tailwind CSS.
      </p>
      <Button variant="contained" color="primary">
        Нажми на меня
      </Button>
    </div>
  );
}