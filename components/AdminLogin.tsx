import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from './Button';
import { TextInput } from './TextInput';

export const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (login(password)) {
      // Authentication successful, redirect will be handled by parent component
    } else {
      setError('密碼錯誤，請重試');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            管理員登入
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            請輸入管理員密碼以存取管理介面
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理員密碼"
                className="rounded-md"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <Button 
              type="submit" 
              className="group relative w-full flex justify-center"
              variant="primary"
            >
              登入管理介面
            </Button>
          </div>
          
          <div className="text-center">
            <a 
              href="/search" 
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              回到使用者查詢介面
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};