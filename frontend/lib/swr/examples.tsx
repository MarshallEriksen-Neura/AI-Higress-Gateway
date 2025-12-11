"use client";

import React from 'react';
import { useApiGet, useApiPost, usePaginatedData, useSearchData, useResource } from '@/lib/swr';

// 示例 1: 基础 GET 请求
export function BasicApiGetExample() {
  const { data: users, error, loading } = useApiGet<User[]>('/users');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h3>User List</h3>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}

// 示例 2: 带参数和缓存策略的请求
export function ApiGetWithParamsExample() {
  const { data: notifications, error, loading } = useApiGet<Notification[]>('/notifications', {
    strategy: 'frequent', // 使用频繁更新策略，30秒自动刷新
    params: { read: false } // 只获取未读通知
  });
  
  return (
    <div>
      <h3>Unread Notifications</h3>
      {loading && <div>Loading notifications...</div>}
      {error && <div>Error loading notifications: {error.message}</div>}
      <ul>
        {notifications?.map(notification => (
          <li key={notification.id}>{notification.message}</li>
        ))}
      </ul>
    </div>
  );
}

// 示例 3: 创建数据的 Mutation
export function CreateUserExample() {
  const { trigger, submitting, error, reset } = useApiPost<User, CreateUserRequest>('/users');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await trigger({ name, email });
      console.log('User created:', newUser);
      setName('');
      setEmail('');
      reset(); // 重置状态
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };
  
  return (
    <div>
      <h3>Create New User</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create User'}
        </button>
        {error && <div className="error">Error: {error.message}</div>}
      </form>
    </div>
  );
}

// 示例 4: 分页数据
export function PaginatedUserListExample() {
  const {
    data: users,
    loading,
    currentPage,
    pageSize,
    total,
    setPage,
    hasNextPage,
    hasPreviousPage
  } = usePaginatedData<User>('/users');
  
  const totalPages = Math.ceil(total / pageSize);
  
  return (
    <div>
      <h3>Paginated Users</h3>
      {loading && <div>Loading...</div>}
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
      
      <div className="pagination">
        <button 
          disabled={!hasPreviousPage} 
          onClick={() => setPage(currentPage - 1)}
        >
          Previous
        </button>
        
        <span>Page {currentPage} of {totalPages}</span>
        
        <button 
          disabled={!hasNextPage} 
          onClick={() => setPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
      
      <div>Total: {total} users</div>
    </div>
  );
}

// 示例 5: 搜索功能
export function SearchUserExample() {
  const {
    data: users,
    loading,
    searchTerm,
    setSearchTerm
  } = useSearchData<User>('/users');
  
  return (
    <div>
      <h3>Search Users</h3>
      <input
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder="Search users by name..."
        style={{ width: '100%', padding: '8px', marginBottom: '16px' }}
      />
      
      <div>
        {loading && <div>Searching...</div>}
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.name} - {user.email}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 示例 6: 完整的 CRUD 资源管理
export function UserResourceManagementExample() {
  const {
    data: users,
    createResource,
    deleteResource,
    creating,
    deleting
  } = useResource<User, CreateUserRequest>('/users');
  
  const [newUserName, setNewUserName] = React.useState('');
  const [newUserEmail, setNewUserEmail] = React.useState('');
  
  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail) return;
    
    try {
      await createResource({ name: newUserName, email: newUserEmail });
      setNewUserName('');
      setNewUserEmail('');
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };
  
  const handleDeleteUser = async (id: string) => {
    try {
      await deleteResource(`${id}`);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };
  
  return (
    <div>
      <h3>User Management</h3>
      
      {/* Create User Form */}
      <div>
        <input
          type="text"
          value={newUserName}
          onChange={e => setNewUserName(e.target.value)}
          placeholder="Name"
        />
        <input
          type="email"
          value={newUserEmail}
          onChange={e => setNewUserEmail(e.target.value)}
          placeholder="Email"
        />
        <button 
          onClick={handleCreateUser} 
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Add User'}
        </button>
      </div>
      
      {/* User List */}
      <ul>
        {users?.map(user => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button 
              onClick={() => handleDeleteUser(user.id)}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 类型定义
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// 示例容器组件，展示所有示例
export function SWRExamplesContainer() {
  const [activeTab, setActiveTab] = React.useState('basic-get');
  
  const renderExample = () => {
    switch (activeTab) {
      case 'basic-get':
        return <BasicApiGetExample />;
      case 'get-with-params':
        return <ApiGetWithParamsExample />;
      case 'create-user':
        return <CreateUserExample />;
      case 'pagination':
        return <PaginatedUserListExample />;
      case 'search':
        return <SearchUserExample />;
      case 'resource-management':
        return <UserResourceManagementExample />;
      default:
        return <div>Select an example from the tabs above</div>;
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>SWR Hook Examples</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('basic-get')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'basic-get' ? 'active' : ''}
        >
          Basic GET
        </button>
        <button 
          onClick={() => setActiveTab('get-with-params')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'get-with-params' ? 'active' : ''}
        >
          GET with Params
        </button>
        <button 
          onClick={() => setActiveTab('create-user')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'create-user' ? 'active' : ''}
        >
          Create User
        </button>
        <button 
          onClick={() => setActiveTab('pagination')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'pagination' ? 'active' : ''}
        >
          Pagination
        </button>
        <button 
          onClick={() => setActiveTab('search')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'search' ? 'active' : ''}
        >
          Search
        </button>
        <button 
          onClick={() => setActiveTab('resource-management')} 
          style={{ marginRight: '10px', padding: '8px' }}
          className={activeTab === 'resource-management' ? 'active' : ''}
        >
          Resource CRUD
        </button>
      </div>
      
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
        {renderExample()}
      </div>
    </div>
  );
}
