from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS
import sqlite3
import pandas as pd
from datetime import date
from flask import g
from dotenv import load_dotenv
import os
import logging
logging.basicConfig(level=logging.DEBUG)


load_dotenv()

app = Flask(__name__)
app.secret_key = 'your_secret_key'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['REMEMBER_COOKIE_HTTPONLY'] = True
# app.config['SERVER_NAME'] = '45.55.197.166'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
# Initialize CORS
CORS(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

class User(UserMixin):
    def __init__(self, id):
        self.id = id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        correct_username = os.environ.get('ADMIN_USERNAME', 'default_user')
        correct_password = os.environ.get('ADMIN_PASSWORD', 'default_password')
        if username == correct_username and password == correct_password:
            user = User(id=1)
            login_user(user)
            return redirect(url_for('seo_data'))
        else:
            flash('Invalid credentials. Please try again.', 'error')
    return render_template('login.html')


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('login'))

# Allowed extensions
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload_files():
    if request.method == 'POST':
        file = request.files.get('file')
        if not file:
            flash('No file part')
            return redirect(request.url)

        if not allowed_file(file.filename):
            flash('Invalid file format')
            return redirect(request.url)

        try:
            # Process the file, assume it's an Excel file
            df = pd.read_excel(file)
            # Store data in the database
            store_data(df)
            flash('File successfully uploaded and data stored.')
        except Exception as e:
            flash('Error processing file: ' + str(e))
            return redirect(request.url)

        return redirect(url_for('upload_files'))  # Redirect after POST to prevent resubmission
    return render_template('upload_files.html')


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect('data.db')
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

@app.teardown_appcontext
def close_db_wrapper(e=None):
    close_db(e)

def store_data(dataframe):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            clienturl TEXT,
            rootdomain TEXT,
            anchor TEXT,
            niche TEXT,
            rd INTEGER,
            dr INTEGER,
            traffic INTEGER,
            placedlink TEXT,
            placedon TEXT,
            uploaddate DATE
        )''')

    # Drop rows where all columns are NaN
    dataframe = dataframe.dropna(how='all')

    # Get all blacklisted domains
    cursor.execute('SELECT domain FROM blacklist_domains')
    blacklisted_domains = {row['domain'] for row in cursor.fetchall()}

    # Filter out rows where 'placedon' is in the blacklist
    dataframe = dataframe[~dataframe['placedon'].isin(blacklisted_domains)]

    # Add uploaddate to the DataFrame
    today = date.today()
    dataframe['uploaddate'] = today

    # Save the DataFrame to SQL, if it's not empty
    if not dataframe.empty:
        dataframe.to_sql('uploads', db, if_exists='append', index=False)
        db.commit()
    db.close()


@app.route('/')
@login_required
def seo_data():
    return render_template('seo_data.html', active_tab='seo_data')



@app.route('/api/data', methods=['GET', 'POST'])
@login_required
def get_data():
    if request.method == 'POST':
        data = request.get_json()
        draw = data.get('draw')
        start = int(data.get('start', 0))
        length = int(data.get('length', 10))
        search_value = data.get('search[value]', '')
        order_column_index = data.get('order[0][column]', 0)
        order_direction = data.get('order[0][dir]', 'asc')
        order_column = ['uploaddate', 'clienturl', 'rootdomain', 'anchor', 'niche', 'rd', 'dr', 'traffic', 'placedlink', 'placedon'][int(order_column_index)]

        # Custom filtering parameters
        exclude_domains = data.get('excludeDomains', [])
        rd_min = data.get('rdMin')
        rd_max = data.get('rdMax')
        dr_min = data.get('drMin')
        dr_max = data.get('drMax')
        traffic_min = data.get('trafficMin')
        traffic_max = data.get('trafficMax')
        client_url = data.get('clientUrl', '')
        root_domain = data.get('rootDomain', '')
        anchor = data.get('anchor', '')
        niche = data.get('niche', '')
        placed_link = data.get('placedLink', '')
        placed_on = data.get('placedOn', '')
        export_all = data.get('export_all', 'false').lower() == 'true'
    else:
        draw = request.args.get('draw')
        start = int(request.args.get('start', 0))
        length = int(request.args.get('length', 10))
        search_value = request.args.get('search[value]', '')
        order_column_index = request.args.get('order[0][column]', 0)
        order_direction = request.args.get('order[0][dir]', 'asc')
        order_column = ['uploaddate', 'clienturl', 'rootdomain', 'anchor', 'niche', 'rd', 'dr', 'traffic', 'placedlink', 'placedon'][int(order_column_index)]

        # Custom filtering parameters
        exclude_domains = request.args.getlist('excludeDomains[]')
        rd_min = request.args.get('rdMin')
        rd_max = request.args.get('rdMax')
        dr_min = request.args.get('drMin')
        dr_max = request.args.get('drMax')
        traffic_min = request.args.get('trafficMin')
        traffic_max = request.args.get('trafficMax')
        client_url = request.args.get('clientUrl', '')
        root_domain = request.args.get('rootDomain', '')
        anchor = request.args.get('anchor', '')
        niche = request.args.get('niche', '')
        placed_link = request.args.get('placedLink', '')
        placed_on = request.args.get('placedOn', '')
        export_all = request.args.get('export_all', 'false').lower() == 'true'

    conn = get_db()
    cursor = conn.cursor()

    # Total records count
    cursor.execute('SELECT COUNT(*) FROM uploads')
    records_total = cursor.fetchone()[0]

    # Base query
    query = 'SELECT * FROM uploads WHERE placedon NOT IN (SELECT domain FROM blacklist_domains)'
    params = []

    # Global search value
    if search_value:
        query += ' AND (clienturl LIKE ? OR rootdomain LIKE ? OR anchor LIKE ? OR niche LIKE ? OR placedlink LIKE ? OR placedon LIKE ?)'
        search_value_wildcard = f'%{search_value}%'
        params.extend([search_value_wildcard] * 6)

    # Custom filters
    if exclude_domains:
        query += ' AND ' + ' AND '.join(['placedon NOT LIKE ?' for _ in exclude_domains])
        params.extend([f'%{domain}%' for domain in exclude_domains])

    if rd_min:
        query += ' AND rd >= ?'
        params.append(rd_min)

    if rd_max:
        query += ' AND rd <= ?'
        params.append(rd_max)

    if dr_min:
        query += ' AND dr >= ?'
        params.append(dr_min)

    if dr_max:
        query += ' AND dr <= ?'
        params.append(dr_max)

    if traffic_min:
        query += ' AND traffic >= ?'
        params.append(traffic_min)

    if traffic_max:
        query += ' AND traffic <= ?'
        params.append(traffic_max)

    if client_url:
        query += ' AND clienturl LIKE ?'
        params.append(f'%{client_url}%')

    if root_domain:
        query += ' AND rootdomain LIKE ?'
        params.append(f'%{root_domain}%')

    if anchor:
        query += ' AND anchor LIKE ?'
        params.append(f'%{anchor}%')

    if niche:
        query += ' AND niche LIKE ?'
        params.append(f'%{niche}%')

    if placed_link:
        query += ' AND placedlink LIKE ?'
        params.append(f'%{placed_link}%')

    if placed_on:
        query += ' AND placedon LIKE ?'
        params.append(f'%{placed_on}%')

    # Total filtered records count
    cursor.execute(f'SELECT COUNT(*) FROM ({query})', params)
    records_filtered = cursor.fetchone()[0]

    # Fetch the data with ordering and pagination
    if not export_all:
        query += f' ORDER BY {order_column} {order_direction} LIMIT ? OFFSET ?'
        params.extend([length, start])
    
    cursor.execute(query, params)
    data = cursor.fetchall()

    result = [dict(row) for row in data]

    response = {
        'draw': draw,
        'recordsTotal': records_total,
        'recordsFiltered': records_filtered,
        'data': result
    }

    return jsonify(response)



@app.route('/inventory_data')
@login_required
def inventory_data():
    return render_template('inventory_data.html', active_tab='inventory_data')

@app.route('/blacklist', methods=['GET', 'POST'])
@login_required
def blacklist():
    if request.method == 'POST':
        domains = request.form.get('domains')
        domain_id = request.form.get('domain_id')

        if 'add' in request.form and domains:
            # Split the domains by newline and add each to the database
            domain_list = [domain.strip() for domain in domains.split('\n') if domain.strip()]
            try:
                with sqlite3.connect('data.db') as conn:
                    cursor = conn.cursor()
                    for domain in domain_list:
                        try:
                            cursor.execute('INSERT INTO blacklist_domains (domain) VALUES (?)', (domain,))
                        except sqlite3.IntegrityError:
                            flash(f'Domain "{domain}" already exists in the blacklist', 'error')
                    conn.commit()
                flash('Domains added successfully', 'success')
            except sqlite3.DatabaseError as e:
                flash(f'Error adding domains: {str(e)}', 'error')
            return redirect(url_for('blacklist'))

        elif 'delete' in request.form and domain_id:
            # Delete domain from the database
            try:
                with sqlite3.connect('data.db') as conn:
                    cursor = conn.cursor()
                    cursor.execute('DELETE FROM blacklist_domains WHERE id = ?', (domain_id,))
                    conn.commit()
                flash('Domain removed successfully', 'success')
            except sqlite3.DatabaseError as e:
                flash(f'Error removing domain: {str(e)}', 'error')
            return redirect(url_for('blacklist'))

    # Fetch current domains from database
    try:
        with sqlite3.connect('data.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT id, domain FROM blacklist_domains')
            domains = cursor.fetchall()
    except sqlite3.DatabaseError as e:
        flash(f'Error fetching domains: {str(e)}', 'error')
        domains = []

    return render_template('blacklist.html', domains=domains, active_tab='blacklist')



@app.route('/upload_blacklist', methods=['POST'])
def upload_blacklist():
    # Check if a file is received
    file = request.files.get('blacklist_file')
    if file and file.filename.endswith(('.xls', '.xlsx')):
        try:
            # Use Pandas to parse the Excel file
            df = pd.read_excel(file)
            # Check if the expected column is in the DataFrame
            if 'BlackList Domain' in df.columns:
                # Connect to the database
                conn = sqlite3.connect('data.db')
                cursor = conn.cursor()
                # Ensure the table exists
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS blacklist_domains (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        domain TEXT UNIQUE NOT NULL)
                ''')
                
                # Insert domains into the database, ignoring duplicates
                domains = df['BlackList Domain'].dropna().unique()  # Remove duplicates and NaN
                cursor.executemany('INSERT OR IGNORE INTO blacklist_domains (domain) VALUES (?)',
                                   [(domain,) for domain in domains])
                conn.commit()
                flash('Blacklist uploaded successfully! Any duplicates were ignored.')
            else:
                flash('Excel file must have a column named "BlackList Domain"')
        except Exception as e:
            flash(f'Error processing file: {str(e)}')
            return redirect(url_for('upload_files'))
    else:
        flash('Please upload a valid Excel file.')

    return redirect(url_for('upload_files'))


@app.route('/flush_uploads', methods=['POST'])
@login_required
def flush_uploads():
    submitted_password = request.form['password']
    correct_password = os.environ.get('FLUSH_DB_PASSWORD', 'default_password_if_not_set')

    if submitted_password == correct_password:
        try:
            with sqlite3.connect('data.db') as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM uploads')
                conn.commit()
            flash('All upload data has been successfully flushed from the database.', 'success')
        except Exception as e:
            flash(f'Error flushing database: {str(e)}', 'error')
    else:
        flash('Incorrect password, failed to flush database.', 'error')

    return redirect(url_for('upload_files'))

if __name__ == '__main__':
    app.run(debug=True)
