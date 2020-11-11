import { navigate } from "@reach/router";

import React from "react";

class LandingPage extends React.Component {
  //NEED TO DO FORM VALIDATION ON USER
  state = {
    user: "",
  };

  updateUsername = (event) => {
    this.setState({ user: event.target.value });
  };

  submitUser = (event) => {
    event.preventDefault();
    this.props.setUser(this.state.user);
    navigate("/dashboard");
  };

  render() {
    return (
      <div className="landing-page--wrapper">
        <div className="landing-page--graphic"></div>
          <form className='signin-form' onSubmit={this.submitUser}>
            <input
            className='signin-input'
              onChange={this.updateUsername}
              type="text"
              placeholder="enter a username..."
            ></input>
            <button className='signin-button' type="submit">PLAY</button>
          </form>
     
      </div>
    );
  }
}

export default LandingPage;
