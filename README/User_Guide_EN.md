# Visitor Management System User Guide (English)

## 📋 System Overview

The Visitor Management System is a modern visitor management platform designed for construction sites, supporting multi-role permission management, providing visitor registration, item borrowing, worker information management, and other functions.

### 🎯 Main Features
- **Visitor Registration Management**: Support for visitor entry/exit registration
- **Item Borrowing System**: Item category management and borrowing/return processes
- **Worker Information Management**: Worker profile management and batch import
- **Multi-role Permissions**: Three-level permission system for administrators, distributors, and guards
- **Data Statistics Reports**: Real-time statistics and data analysis
- **Multi-language Support**: Chinese, English, Traditional Chinese

## 🔐 System Login

### Access Address
- System URL: `http://server-ip-address` or `http://domain-name`
- Default Port: 80 (HTTP) or 443 (HTTPS)

### Login Steps
1. Open browser and navigate to system URL
2. Enter username and password on login page
3. Click "Login" button
4. System will automatically redirect to appropriate page based on user role

### User Role Description
The system supports three user roles, each with different permissions and functions:

| Role | Permission Scope | Main Functions |
|------|------------------|----------------|
| **Administrator (ADMIN)** | Highest system permissions | System configuration, user management, data statistics, global monitoring |
| **Distributor (DISTRIBUTOR)** | Subcontractor management permissions | Worker information management, QR code generation, data import/export |
| **Guard (GUARD)** | On-site operation permissions | Visitor registration, item borrowing, entry/exit management |

## 👨‍💼 Administrator Functions

### System Overview
After login, administrators enter the system dashboard where they can view:
- Real-time statistics
- System operation status
- User activity monitoring
- Data report analysis

### Main Function Modules

#### 1. Data Statistics Reports
- **Visitor Statistics**: Entry/exit personnel statistics
- **Item Borrowing Statistics**: Borrowed/returned item statistics
- **Worker Statistics**: Active, suspended worker statistics
- **Time Range Filtering**: Support for daily, monthly, annual statistics
- **Data Export**: Support for Excel format export

#### 2. Worker Information Management
- **Worker Profiles**: View all worker information
- **Batch Import**: Excel file batch import of worker data
- **Information Maintenance**: Edit, delete worker information
- **Status Management**: Active, suspended, terminated status management

#### 3. Site Management
- **Site Information**: Add, edit, delete site information
- **Site Status**: Activate, suspend site status management
- **Association Management**: Site association with distributors and guards

#### 4. Item Category Management
- **Category Maintenance**: Add, edit, delete item categories
- **Status Management**: Category activation/deactivation status
- **Associated Items**: View item lists under categories

#### 5. Item Borrowing Records
- **Borrowing History**: View all item borrowing records
- **Status Tracking**: Borrowed, returned, overdue status
- **Record Query**: Filter by worker, item, time
- **Data Export**: Excel export of borrowing records

#### 6. Account Settings
- **Personal Information**: Modify personal profile
- **Password Change**: Change login password
- **System Configuration**: System parameter configuration

## 🏢 Distributor Functions

### Function Overview
After login, distributors enter the worker management page with main functions including:

#### 1. Worker Information Management
- **Worker List**: View worker information belonging to the distributor
- **Add Worker**: Manually add new worker information
- **Edit Worker**: Modify basic worker information
- **Batch Import**: Excel file batch import of worker data
- **Status Management**: Set worker active/suspended/terminated status

#### 2. QR Code Function
- **Generate QR Code**: Generate unique QR code for each worker
- **Download QR Code**: Download QR code image file
- **Copy Data**: Copy QR code data to clipboard
- **Batch Generation**: Batch generate QR codes for multiple workers

#### 3. Data Management
- **Search Filter**: Search by name, number, phone, ID number
- **Status Filter**: Filter display by worker status
- **Data Export**: Export worker information to Excel
- **Data Statistics**: Display total workers, active count, suspended count, etc.

#### 4. Worker Self-Registration
- **Registration Page**: Workers can self-register information
- **Information Verification**: Verify worker identity and distributor association
- **Status Review**: Distributor review of worker registration applications

## 🛡️ Guard Functions

### Function Overview
After login, guards enter the guard operation page with main functions including:

#### 1. Visitor Entry Registration
**Operation Steps:**
1. Click "Entry Registration" button
2. Enter worker number or scan QR code
3. System displays basic worker information
4. Enter physical card number (optional)
5. Enter contact phone number (optional)
6. Click "Complete Entry" button

**Notes:**
- System checks if worker is already on-site to prevent duplicate registration
- Valid worker number must be entered
- Worker must belong to current site

#### 2. Item Borrowing Management
**Borrow Item Steps:**
1. Click "Item Borrowing" button
2. Enter worker number to query worker information
3. Select item type (from dropdown list)
4. Enter item number
5. Add remark information (optional)
6. Click "Add" to add item to borrowing list
7. Click "Complete Borrowing" to save record

**Return Item Steps:**
1. Click "Item Return" button
2. Enter worker number to query borrowing records
3. Select items to return
4. Confirm return information
5. Click "Complete Return" to update record

#### 3. Visitor Exit Registration
**Operation Steps:**
1. Click "Exit Registration" button
2. Enter worker number to query entry records
3. Confirm exit information
4. Handle borrowed items:
   - If there are borrowed items, choose to return or add remark information
   - After adding remark information, worker can take items when leaving
   - Items without remarks must be returned before leaving
5. Click "Complete Exit" button

**Item Handling Rules:**
- Borrowed items with remarks: Worker can take them when leaving
- Borrowed items without remarks: Must be returned before leaving
- Guards can operate item returns during exit process

#### 4. Data Statistics
- **Today's Entry**: Display today's entry count
- **Today's Exit**: Display today's exit count
- **On-site Count**: Display current on-site count
- **Borrowed Items**: Display current borrowed item count
- **Returned Items**: Display today's returned item count

#### 5. Personal Center
- **Change Password**: Change login password
- **Personal Information**: View personal profile
- **Operation Records**: View personal operation history

## 📱 Worker Self-Registration Function

### Registration Process
1. Access system registration page
2. Fill in personal information:
   - Worker number
   - Name
   - ID number
   - Contact phone
   - Email address
   - Associated distributor
3. Submit registration application
4. System automatically generates personal QR code
5. Save QR code image
6. Registration completed, can be used immediately

### Registration Requirements
- Worker number must be unique
- ID number must be valid
- Contact phone must be correct
- Must select valid distributor
- No approval required after registration, can use system immediately

## 🔧 System Settings

### Environment Configuration
System supports multi-environment configuration:
- **Development Environment**: For development and testing
- **Production Environment**: For formal operation
- **Test Environment**: For functional testing

### Multi-language Support
System supports three languages:
- **Simplified Chinese (zh-CN)**: Default language
- **English (en-US)**: English interface
- **Traditional Chinese (zh-TW)**: Traditional Chinese interface

### Data Backup
- **Automatic Backup**: System automatically backs up data periodically
- **Manual Backup**: Administrators can manually trigger backup
- **Data Recovery**: Support data recovery from backup files

## 🚨 Common Issues

### Login Issues
**Q: What to do if password is forgotten?**
A: Contact system administrator to reset password.

**Q: Login shows "Account has been disabled"?**
A: Contact administrator to check account status.

### Function Issues
**Q: Cannot find worker information?**
A: Please confirm worker number is correct and worker belongs to current site.

**Q: Item borrowing failed?**
A: Please check if item type is correct and item is available.

**Q: Cannot complete exit registration?**
A: Please confirm worker has valid entry record. For borrowed items, you can add remark information to take them when leaving, or choose to return items.

### Technical Issues
**Q: Page loads slowly?**
A: Please check network connection or contact technical support.

**Q: Data not displaying?**
A: Please refresh page or contact administrator to check data status.

## 📞 Technical Support

### Contact Information
- **Technical Support Email**: support@example.com
- **System Administrator**: admin@example.com
- **Emergency Contact**: +86-xxx-xxxx-xxxx

### System Requirements
- **Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Network**: Stable internet connection
- **Device**: PC, tablet, mobile (PC recommended)

### Update Log
System is updated regularly, new features will be notified through system notifications.

---

## 📋 Quick Operation Guide

### Administrator Quick Operations
1. **View Statistics**: Login and directly view dashboard data
2. **Manage Workers**: Enter "Worker Management" page
3. **View Reports**: Enter "Data Statistics" page
4. **System Settings**: Enter "Account Settings" page

### Distributor Quick Operations
1. **Manage Workers**: Login and directly enter worker management page
2. **Generate QR Code**: Select worker, click "Generate QR Code"
3. **Batch Import**: Click "Batch Import" to upload Excel file
4. **Data Export**: Click "Export Data" to download Excel file

### Guard Quick Operations
1. **Entry Registration**: Click "Entry Registration" → Enter worker number → Complete registration
2. **Item Borrowing**: Click "Item Borrowing" → Select item → Complete borrowing
3. **Exit Registration**: Click "Exit Registration" → Confirm information → Complete exit
4. **View Statistics**: View statistics at top of page

---

*This user guide covers the main functions and usage methods of the Visitor Management System. For questions, please contact the system administrator or technical support team.*
