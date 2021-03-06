import React from "react";
import "firebase/firestore";
import firebase from "../../config.js";
import "firebase/functions";
import { navigate } from "@reach/router";
import * as _ from "underscore";
import trophy from "../../img/trophy.png";
import cactus from "../../img/cactus-avatar.png";
import zombie from "../../img/zombie-avatar.png";
import sheep from "../../img/sheep-avatar.png";
import coffee from "../../img/coffee-avatar.png";
import alien from "../../img/alien-avatar.png";
import sloth from "../../img/sloth-avatar.png";

const avatarStore = {
  cactus: cactus,
  zombie: zombie,
  sheep: sheep,
  coffee: coffee,
  alien: alien,
  sloth: sloth,
};

const db = firebase.firestore();
const rooms = db.collection("rooms");
class Room extends React.Component {
  state = {
    users: [],
    host: "",
    questions: [],
    time_up: false,
    current_question: 0,
    isLoading: true,
    selected: false,
    multi: true,
  };

  returnToDashboard = () => {
    navigate("/dashboard");
    if (this.props.user === this.state.host) {
      this.updateLeaderBoard();

      db.collection("rooms").doc(this.props.room_id).delete();
      //delete the doc
    } else {
      //delete the person from the room
      db.collection("rooms")
        .doc(this.props.room_id)
        .collection("users")
        .doc(this.props.user)
        .delete();
    }
  };

  getUserInfo = () => {
    return rooms.doc(this.props.room_id).collection("users").get();
  };

  getRoomInfo = (roomData) => {
    const userData = [];
    this.getUserInfo().then((docs) => {
      docs.forEach((doc) => {
        userData.push(doc.data());
      });
      this.setState({
        users: [...userData],
        host: roomData.host,
        questions: [...roomData.questions],
        time_up: roomData.time_up,
        current_question: roomData.current_question,
        isLoading: false,
        multi: roomData.multi,
      });
    });
  };

  processNextQuestion = () => {
    db.collection("rooms")
      .doc(this.props.room_id)
      .update({
        current_question: firebase.firestore.FieldValue.increment(1),
        time_up: false,
      });
  };

  selectAnswer = (event) => {
    const answer = event.target.innerText;

    rooms
      .doc(this.props.room_id)
      .collection("users")
      .doc(this.props.user)
      .update({ answers: firebase.firestore.FieldValue.arrayUnion(answer) });
    this.setState({ selected: true });
  };

  updateUserScore = () => {
    ///compare each users answers against the correct answer, update score on db
    return db
      .collection("rooms")
      .doc(this.props.room_id)
      .collection("users")
      .doc(this.props.user)
      .get()
      .then((doc) => {
        let answer = doc.data().answers[this.state.current_question];

        if (
          answer ===
          this.decode(
            this.state.questions[this.state.current_question].correct_answer
          )
        ) {
          db.collection("rooms")
            .doc(this.props.room_id)
            .collection("users")
            .doc(this.props.user)
            .update({ score: firebase.firestore.FieldValue.increment(1) });
          //updated score is not being shown on the page, need to set the state of users, so updated score shows on page
        } else {
          db.collection("rooms")
            .doc(this.props.room_id)
            .collection("users")
            .doc(this.props.user)
            .update({
              incorrect_answers: firebase.firestore.FieldValue.increment(1),
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  roomListener = db
    .collection("rooms")
    .doc(this.props.room_id)
    .onSnapshot((roomSnapshot) => {
      if (
        roomSnapshot.data() !== undefined &&
        roomSnapshot.data().current_question !== this.state.current_question
      ) {
        this.setState({
          current_question: roomSnapshot.data().current_question,
          selected: false,
        });
      }
      if (
        roomSnapshot.data() !== undefined &&
        roomSnapshot.data().time_up !== this.state.time_up
      ) {
        this.setState({
          time_up: roomSnapshot.data().time_up,
        });
      }
    });

  allAnsweredListener = db
    .collection("rooms")
    .doc(this.props.room_id)
    .collection("users")
    .onSnapshot((usersSnapshot) => {
      //
      let allAnswered = true;
      //checking to see if time_up is true, so we know to display the results and the next question button
      if (this.state.time_up === false) {
        usersSnapshot.forEach((user) => {
          if (user.data().answers.length <= this.state.current_question) {
            allAnswered = false;
          }
        });

        if (allAnswered === true) {
          db.collection("rooms")
            .doc(this.props.room_id)
            .update({ time_up: true });
          this.updateUserScore();
        }
      } else {
        // if time up is true, get users by scores and put in state so they can be displayed display
        const newUsers = [];
        usersSnapshot.forEach((user) => {
          newUsers.push(user.data());
        });

        newUsers.sort(function compare(a, b) {
          //sort the user scores
          if (a.score > b.score) {
            return -1;
          }
          if (a.score < b.score) {
            return 1;
          }

          return 0;
        });

        this.setState({
          users: [...newUsers],
        });
      }
    });
  //if user doesnt exist as doc, use set, else update
  updateLeaderBoard = () => {
    // let winner = this.state.users[0].username;
    let winners = [];

    let winnersEndPos = 0;
    while (
      winnersEndPos < this.state.users.length - 1 &&
      this.state.users[winnersEndPos + 1].score === this.state.users[0].score
    ) {
      winnersEndPos++;
    }
    for (let i = 0; i <= winnersEndPos; i++) {
      winners.push(this.state.users[i].username);
    }

    winners.forEach((winner) => {
      db.collection("Leaderboard")
        .doc(winner)
        .get()
        .then((user) => {
          if (user.exists) {
            db.collection("Leaderboard")
              .doc(winner)
              .update({
                score: firebase.firestore.FieldValue.increment(10),
                name: winner,
              });
          } else {
            db.collection("Leaderboard").doc(winner).set({
              score: 10,
              name: winner,
            });
          }
        });
    });
  };

  playAgain = () => {
    this.updateLeaderBoard();
    this.props.resetQuiz();
    this.state.users.forEach((user) => {
      const newUser = {
        username: user.username,
        score: 0,
        answers: [],
      };
      db.collection("rooms")
        .doc(this.props.room_id)
        .collection("users")
        .doc(user.username)
        .set(newUser);
    });

    db.collection("rooms")
      .doc(this.props.room_id)
      .update({ current_question: 0 });
  };

  getWinnerPos = () => {
    let winnersEndPos = 0;
    while (
      winnersEndPos < this.state.users.length - 1 &&
      this.state.users[winnersEndPos + 1].score === this.state.users[0].score
    ) {
      winnersEndPos++;
    }
    return winnersEndPos;
  };

  getWinners = () => {
    const winnersEndPos = this.getWinnerPos();

    let winnerStr = "";
    if (winnersEndPos === 0) {
      winnerStr += `${this.state.users[0].username} is the winner!`;
    } else if (winnersEndPos === 1) {
      winnerStr += `${this.state.users[0].username} and ${this.state.users[1].username} are the winners!`;
    } else {
      for (let i = 0; i <= winnersEndPos; i++) {
        if (i === winnersEndPos) {
          winnerStr += `and ${this.state.users[i].username} are the winners!`;
        } else if (i === winnersEndPos - 1) {
          winnerStr += `${this.state.users[i].username} `;
        } else {
          winnerStr += `${this.state.users[i].username}, `;
        }
      }
    }
    return winnerStr;
  };

  componentDidMount() {
    rooms
      .doc(this.props.room_id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const roomData = doc.data();
          this.getRoomInfo(roomData);
        } else {
          console.log("No such document!");
        }
      })
      .catch(function (error) {
        console.log("Error getting document:", error);
      });
  }

  decode = (sentence) => {
    let newSentence = _.unescape(
      sentence
        .replace(/&#039;/g, "'")
        .replace(/&eacute;/gi, "é")
        .replace(/&rsquo;/gi, "'")
        .replace(/&ldquo;/gi, "'")
        .replace(/&hellip;/gi, "___")
        .replace(/&rdquo;/gi, "'")
        .replace(/&shy;/gi, "-")
        .replace(/&aacute;/gi, "á")
        .replace(/&iacute;/gi, "í")
        .replace(/&ouml;/gi, "ö")
        .replace(/&agrave;/gi, "à")
        .replace(/&egrave;/gi, "è")
        .replace(/&euml;/gi, "ë")
        .replace(/&ograve;/gi, "ò")
        .replace(/&oacute;/gi, "ó")
        .replace(/&#153;/gi, "™")
        .replace(/&copy;/gi, "©")
        .replace(/&uuml;/gi, "ü")
    );
    return newSentence;
  };

  render() {
    if (this.state.isLoading === true) {
      return <h1>LOADING.....</h1>;
    } else {
      return (
        <div className="questions-wrapper">
          {this.state.current_question !== 10 ? (
            <div className="current-question">
              <div className="box sb1">
                <span className="question-num">
                  Question {this.state.current_question + 1}
                </span>
                <span>
                  {this.decode(
                    this.state.questions[this.state.current_question].question
                  )}
                </span>
              </div>
              <div className="answerbuttons--container">
                {this.state.questions[
                  this.state.current_question
                ].all_answers.map((answer) => {
                  return (
                    <button
                      disabled={this.state.selected}
                      onClick={this.selectAnswer}
                      className={
                        this.state.questions[this.state.current_question]
                          .correct_answer === answer && this.state.time_up
                          ? "correct-answerbutton"
                          : "answerbutton"
                      }
                      key={answer}
                    >
                      {this.decode(answer)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // announce winner
            <div className="winner-banner">
              <div className="winner-images">
                {this.state.users.map((user, i) => {
                  const winnersEndPos = this.getWinnerPos();
                  if (i <= winnersEndPos) {
                    return (
                      <img
                        className="winner-avatar"
                        src={avatarStore[user.avatar]}
                        alt="winner avatar"
                        key={`${user}${i}`}
                      ></img>
                    );
                  } else {
                    return null;
                  }
                })}
              </div>

              {this.state.multi && (
                <h1 className="winner">{this.getWinners()}</h1>
              )}
              {!this.state.multi && <h1 className="winner">Quiz Complete!</h1>}

              <img className="trophy" src={trophy} alt="trophy"></img>
            </div>
          )}

          <div className="user-scores-container">
            <h4 className="user-scores">Scores:</h4>
            {this.state.users.map((user, i) => {
              return (
                <p
                  className="user-score"
                  key={user + i}
                >{`${user.username}: ${user.score}`}</p>
              );
            })}
          </div>

          {this.state.time_up && this.state.current_question < 10 ? (
            <div className="user-answers-container">
              {this.state.users.map((user, i) => {
                return (
                  <div key={user.username + i}>
                    <strong>{`${user.username} answered:`}</strong>
                    <span>
                      {this.decode(
                        ` ${user.answers[this.state.current_question] || " "}`
                      )}
                    </span>
                  </div>
                );
              })}
              <h4 className="correct-answer">Correct answer...</h4>
              <p className="correct-answer">
                {this.decode(
                  `${
                    this.state.questions[this.state.current_question]
                      .correct_answer
                  }`
                )}
              </p>
            </div>
          ) : null}

          {this.state.time_up &&
          this.props.user === this.state.host &&
          this.state.current_question !== 10 ? (
            <button
              className="next-question-btn"
              onClick={this.processNextQuestion}
            >
              NEXT QUESTION
            </button>
          ) : null}

          {this.state.current_question === 10 && (
            <div className="endgame-buttons-container">
              {this.props.user === this.state.host && (
                <button className="endgame-buttons" onClick={this.playAgain}>
                  PLAY AGAIN
                </button>
              )}

              <button
                className="endgame-buttons"
                onClick={this.returnToDashboard}
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      );
    }
  }
}

export default Room;
