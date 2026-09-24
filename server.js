require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const app = express();

const PORT = process.env.PORT || 5000;

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const jwtSecret = process.env.JWT_SECRET;

if (
    !supabaseUrl ||
    !supabaseSecretKey ||
    !adminUsername ||
    !adminPassword ||
    !jwtSecret
) {
    console.error('Error: Missing required environment variables in .env file.');
    process.exit(1);
}

// ============================================================
// SUPABASE
// ============================================================

const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// ============================================================
// AUTHENTICATION
// ============================================================

// POST /api/auth/login

// POST /api/auth/change-password

app.post(
    '/api/auth/change-password',
    authenticateToken,
    async (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required.'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.'
            });
        }

        try {
            const username = req.user.username;

            const { data: admin, error } = await supabase
                .from('admin_users')
                .select('id, username, password_hash')
                .eq('username', username)
                .single();

            if (error || !admin) {
                return res.status(404).json({
                    success: false,
                    message: 'Admin account not found.'
                });
            }

            const currentPasswordMatch = await bcrypt.compare(
                currentPassword,
                admin.password_hash
            );

            if (!currentPasswordMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect.'
                });
            }

            const newPasswordHash = await bcrypt.hash(
                newPassword,
                12
            );

            const { error: updateError } = await supabase
                .from('admin_users')
                .update({
                    password_hash: newPasswordHash
                })
                .eq('id', admin.id);

            if (updateError) {
                console.error(
                    'Password update error:',
                    updateError
                );

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update password.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Password changed successfully.'
            });

        } catch (error) {
            console.error(
                'Change password error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Server error.'
            });
        }
    }
);

// POST /api/auth/change-password// POST /api/auth/login

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    try {
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('id, username, password_hash')
            .eq('username', username)
            .single();

        if (error || !admin) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect username or password.'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect username or password.'
            });
        }

        const token = jwt.sign(
            {
                username: admin.username,
                role: 'admin'
            },
            jwtSecret,
            {
                expiresIn: '8h'
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token
        });

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error.'
        });
    }
});

app.post('/api/auth/change-password', (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Current password and new password are required.'
        });
    }

    if (currentPassword !== adminPassword) {
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect.'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'New password must be at least 8 characters.'
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Password change request received.'
    });
});

// ============================================================
// ONE-TIME ADMIN SETUP
// ============================================================

app.post('/api/auth/setup-admin', async (req, res) => {
    try {
        const username = process.env.ADMIN_USERNAME;
        const password = process.env.ADMIN_PASSWORD;

        if (!username || !password) {
            return res.status(500).json({
                success: false,
                message: 'Admin credentials are missing from .env'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const { data, error } = await supabase
            .from('admin_users')
            .insert([
                {
                    username: username,
                    password_hash: passwordHash
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Admin setup error:', error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Admin account created successfully.'
        });

    } catch (error) {
        console.error('Admin setup error:', error);

        return res.status(500).json({
            success: false,
            message: 'Server error.'
        });
    }
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            message: 'Invalid authorization format.'
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, jwtSecret);

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.'
        });
    }
}

// ============================================================
// PUBLIC RESERVATION ENDPOINT
// ============================================================

// POST /api/reservations

app.post('/api/reservations', async (req, res) => {
    const {
        name,
        phone,
        date,
        time,
        guests,
        specialRequests
    } = req.body;

    // Required fields

    if (!name || !phone || !date || !time || !guests) {
        return res.status(400).json({
            success: false,
            message: 'All required fields must be filled.'
        });
    }

    // Name validation

    const nameRegex = /^[A-Za-z\s]{3,}$/;

    // Clean phone number

    const cleanPhone = String(phone).replace(/[\s-]/g, '');

    // Phone validation
    // Allows optional + followed by 10-14 digits

    const phoneRegex = /^\+?[0-9]{10,14}$/;

    if (!nameRegex.test(name.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Invalid name format. Minimum 3 characters, letters only.'
        });
    }

    if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid phone number format.'
        });
    }

    try {
        const guestCount = parseInt(guests, 10);

        const { data, error } = await supabase
            .from('reservations')
            .insert([
                {
                    name: name.trim(),
                    phone: cleanPhone,
                    date: date,
                    time: time,
                    guests: isNaN(guestCount) ? 1 : guestCount,
                    special_requests: specialRequests
                        ? specialRequests.trim()
                        : '',
                    status: 'pending'
                }
            ])
            .select();

        if (error) {
            console.error(
                'Supabase Database Error:',
                error.message
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to record reservation in database.'
            });
        }

        console.log(
            'Reservation successfully saved:',
            data
        );

        return res.status(200).json({
            success: true,
            message: 'Reservation successfully created.'
        });

    } catch (err) {
        console.error(
            'Unexpected Server Error:',
            err
        );

        return res.status(500).json({
            success: false,
            message: 'An internal server error occurred.'
        });
    }
});

// ============================================================
// PROTECTED ADMIN ROUTES
// ============================================================

// GET /api/reservations

app.get(
    '/api/reservations',
    authenticateToken,
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('reservations')
                .select('*')
                .order('created_at', {
                    ascending: false
                });

            if (error) {
                console.error(
                    'Supabase Database Error:',
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch reservations.'
                });
            }

            return res.status(200).json({
                success: true,
                reservations: data
            });

        } catch (err) {
            console.error(
                'Unexpected Server Error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
    }
);

// ============================================================
// PATCH RESERVATION STATUS
// ============================================================

app.patch(
    '/api/reservations/:id/status',
    authenticateToken,
    async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = [
            'pending',
            'confirmed',
            'cancelled'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status.'
            });
        }

        try {
            const { data, error } = await supabase
                .from('reservations')
                .update({
                    status: status
                })
                .eq('id', id)
                .select();

            if (error) {
                console.error(
                    'Supabase Database Error:',
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message: 'Failed to update reservation status.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Reservation status updated successfully.',
                reservation: data[0]
            });

        } catch (err) {
            console.error(
                'Unexpected Server Error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
    }
);

// ============================================================
// DELETE RESERVATION
// ============================================================

app.delete(
    '/api/reservations/:id',
    authenticateToken,
    async (req, res) => {
        const { id } = req.params;

        try {
            const { error } = await supabase
                .from('reservations')
                .delete()
                .eq('id', id);

            if (error) {
                console.error(
                    'Supabase Database Error:',
                    error.message
                );

                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete reservation.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Reservation deleted successfully.'
            });

        } catch (err) {
            console.error(
                'Unexpected Server Error:',
                err
            );

            return res.status(500).json({
                success: false,
                message: 'An internal server error occurred.'
            });
        }
    }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(
        `NOIR Cafe Backend Server running on http://localhost:${PORT}`
    );
});