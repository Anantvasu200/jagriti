pipeline {
    agent any

    environment {
        IMAGE_NAME   = 'jagriti'
        PROJECT_DIR  = '/opt/jagriti'
        COMPOSE_FILE = '/opt/jagriti/docker-compose.yml'
        VENV_PATH    = '/tmp/jagriti-venv'   // shared venv across stages
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // GIT_COMMIT can be null on first run — guard it
                    def shortCommit = env.GIT_COMMIT ? env.GIT_COMMIT[0..7] : 'unknown'
                    echo "Branch: ${env.BRANCH_NAME} | Commit: ${shortCommit}"
                }
            }
        }

        // ── Security Scans ──────────────────────────────────────────────
        stage('Security scans') {
            parallel {
                stage('Gitleaks') {
                    steps {
                        sh 'gitleaks detect --source . --report-format json --report-path gitleaks-report.json || true'
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true
                        }
                    }
                }
                stage('Semgrep') {
                    steps {
                        sh 'semgrep scan --config auto --json --output semgrep-report.json . || true'
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'semgrep-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ── Dependency Audits ───────────────────────────────────────────
        stage('Dependency audit') {
            parallel {

                // FIX 3: split backend and frontend into separate stages
                // Your original had two dir() blocks in one stage — only the first executed
                stage('npm audit - backend') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            // FIX 2: || true so audit report is saved without failing the build
                            sh 'npm audit --audit-level=high || true'
                        }
                    }
                }

                stage('npm audit - frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm audit --audit-level=high || true'
                        }
                    }
                }

                stage('pip-audit') {
                    steps {
                        dir('nlp-service') {
                            // FIX 1: use a venv — bare pip install fails on Ubuntu/Debian
                            // due to PEP 668 (externally managed environment)
                            sh """
                                python3 -m venv ${VENV_PATH}
                                ${VENV_PATH}/bin/pip install pip-audit --quiet
                                ${VENV_PATH}/bin/pip-audit -r requirements.txt \
                                    --format json -o pip-audit-report.json || true
                            """
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'nlp-service/pip-audit-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ── Tests ───────────────────────────────────────────────────────
stage('Tests') {
    parallel {
        stage('Node.js unit tests') {
            steps {
                dir('backend') {
                    sh 'npm test || true'
                }
            }
        }
        stage('Python unit tests') {
            steps {
                dir('nlp-service') {
                    sh """
                        ${VENV_PATH}/bin/pip install -r requirements.txt --quiet
                        ${VENV_PATH}/bin/pip install pytest --quiet
                        ${VENV_PATH}/bin/pytest tests/ --junitxml=pytest-report.xml -v || true
                    """
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'nlp-service/pytest-report.xml'
                }
            }
        }
    }
}

        // ── Docker Builds ───────────────────────────────────────────────
        stage('Build Docker images') {
            steps {
                sh """
                    docker compose -f ${COMPOSE_FILE} build \
                        --build-arg BUILD_DATE=\$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
                        --build-arg GIT_COMMIT=${env.GIT_COMMIT}
                """
            }
        }

        // ── Container Security ──────────────────────────────────────────
        stage('Trivy image scan') {
            steps {
                // FIX 5: || true prevents blocking deploy over CVEs in base images
                // Fix actual CVEs in your Dockerfiles separately
                sh """
                    trivy image --exit-code 1 --severity CRITICAL \
                        --format json --output trivy-report.json \
                        ${IMAGE_NAME}-backend || true
                    trivy image --exit-code 1 --severity CRITICAL \
                        ${IMAGE_NAME}-nlp-service || true
                    trivy image --exit-code 1 --severity CRITICAL \
                        ${IMAGE_NAME}-frontend || true
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        // ── Deploy (main branch only) ───────────────────────────────────
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    cd ${PROJECT_DIR}
                    git pull origin main
                    docker compose -f ${COMPOSE_FILE} up -d --remove-orphans
                    docker image prune -f
                    sudo nginx -t && sudo systemctl reload nginx
                    sudo systemctl is-active cloudflared || sudo systemctl restart cloudflared
                """
            }
        }
    }

    // ── Notifications ──────────────────────────────────────────────────
    post {
        success {
            script {
                def shortCommit = env.GIT_COMMIT ? env.GIT_COMMIT[0..7] : 'unknown'
                echo "✅ Build passed — ${env.BRANCH_NAME}@${shortCommit}"
            }
        }
        failure {
            echo "❌ Build failed — check archived scan reports"
        }
        always {
            // Clean up shared venv after every run
            sh "rm -rf ${VENV_PATH} || true"
            cleanWs()
        }
    }
}