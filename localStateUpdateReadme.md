# 工人信息表格状态更新说明

## 问题描述

在 `/distributor/workers` 页面（`DistributorWorkerUpload.tsx` 组件）中，修改工人信息后，该工人记录会移动位置。这是因为每次更新操作后，代码会调用 `loadWorkers()` 重新从后端获取所有工人数据，即使后端按照 `createdAt` 降序排序，表格中的位置仍可能变化，导致用户体验不佳。

## 解决方案

我们通过修改前端代码，使用本地状态更新替代重新加载全部数据，保持工人记录在表格中的相对位置不变：

1. 编辑工人信息时：直接更新本地状态中对应的工人数据
2. 添加新工人时：将新工人添加到本地工人列表的头部
3. 删除工人时：从本地状态中过滤掉被删除的工人

## 修改的代码部分

1. `onWorkerSubmit` 函数 - 编辑工人和添加工人
2. `handleDeleteWorker` 函数 - 删除工人
3. `handleToggleStatus` 函数 - 这部分已经在使用本地状态更新

## 如果需要恢复原始行为

如果需要恢复原始行为（即每次操作后重新加载所有数据），可以将以下代码：

```javascript
// 不再重新加载数据，使用本地状态更新
setWorkerModalOpen(false)
setEditingWorker(null)
workerForm.resetFields()
```

改回为：

```javascript
// 重新加载数据
await loadWorkers()
setWorkerModalOpen(false)
setEditingWorker(null)
workerForm.resetFields()
```

并移除所有直接更新本地状态的代码。

## 注意事项

虽然这种方法保持了表格中工人记录的位置不变，提高了用户体验，但是有可能导致前端显示的数据与后端实际数据不完全同步。如果多个用户同时操作同一个工人，或者在其他页面也有修改操作，可能会出现数据不一致的情况。

在这种情况下，可以考虑以下方案：

1. 定期自动刷新数据（例如每隔一定时间调用一次 `loadWorkers()`）
2. 添加手动刷新按钮，让用户可以在需要时刷新数据
3. 实现WebSocket或类似技术，实时推送数据更新
