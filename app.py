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
app.config['SERVER_NAME'] = '45.55.197.166'
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
            print("Session:", dict(session))
            print("Is Authenticated:", current_user.is_authenticated)
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
    print("Method type:", request.method)  # Debug print
    if request.method == 'POST':
        print("Files in request:", request.files)  # Debug print
        file = request.files.get('file')
        if not file:
            flash('No file part')
            print("No file uploaded")  # Debug print
            return redirect(request.url)
        print("File received:", file.filename)  # Debug print

        if not allowed_file(file.filename):
            flash('Invalid file format')
            print("Invalid file format")  # Debug print
            return redirect(request.url)

        try:
            # Process the file, assume it's an Excel file
            df = pd.read_excel(file)
            # Store data in the database
            store_data(df)
            flash('File successfully uploaded and data stored.')
            print("File processed and data stored")  # Debug print
        except Exception as e:
            flash('Error processing file: ' + str(e))
            print("Error processing file:", str(e))  # Debug print
            return redirect(request.url)

        return redirect(url_for('upload_files'))  # Redirect after POST to prevent resubmission
    return render_template('upload_files.html')


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect('data.db')
        g.db.row_factory = sqlite3.Row
    return g.db

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

@app.route('/api/data')
@login_required
def get_data():
    # Connect to your SQLite database
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row  # Enable column access by name
    cursor = conn.cursor()

    # SQL query that excludes rows with 'placedon' in the blacklist
    query = '''
    SELECT clienturl, rootdomain, anchor, niche, rd, dr, traffic, placedlink, placedon, uploaddate
    FROM uploads
    WHERE placedon NOT IN (SELECT domain FROM blacklist_domains)
    '''
    cursor.execute(query)
    rows = cursor.fetchall()

    # Convert rows to a list of dicts, which is JSON-serializable
    data = [
        {"uploaddate": row["uploaddate"], "clienturl": row["clienturl"], "rootdomain": row["rootdomain"], 
         "anchor": row["anchor"], "niche": row["niche"], "rd": row["rd"], "dr": row["dr"], 
         "traffic": row["traffic"], "placedlink": row["placedlink"], "placedon": row["placedon"]}
        for row in rows
    ]

    conn.close()
    return jsonify(data)



@app.route('/inventory_data')
@login_required
def inventory_data():
    return render_template('inventory_data.html', active_tab='inventory_data')

@app.route('/blacklist', methods=['GET', 'POST'])
@login_required
def blacklist():
    if request.method == 'POST':
        domain = request.form.get('domain')
        domain_id = request.form.get('domain_id')

        if 'add' in request.form and domain:
            # Add domain to the database
            try:
                with sqlite3.connect('data.db') as conn:
                    cursor = conn.cursor()
                    cursor.execute('INSERT INTO blacklist_domains (domain) VALUES (?)', (domain,))
                    conn.commit()
                flash('Domain added successfully', 'success')
            except sqlite3.IntegrityError:
                flash('Domain already exists in the blacklist', 'error')

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
